-- ============================================================================
-- SixCentral — initial schema (Supabase / Postgres)
-- Reputation ("The Come-Up" / Respect) + crowdsourced tracker + content + clips.
-- Apply with the Supabase CLI:  supabase db push   (or paste into the SQL editor)
-- ============================================================================

create extension if not exists pgcrypto;

-- Helper: keep updated_at fresh -------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ============================================================================
-- RANKS — the criminal-ascension ladder (Fresh off the Bus -> City Legend)
-- ============================================================================
create table ranks (
  id          int primary key,          -- tier (0..9)
  name        text not null,
  min_respect int  not null,
  heat        int  not null default 0,  -- "heat" stars 0..5
  perk        text
);

insert into ranks (id, name, min_respect, heat, perk) values
  (0, 'Fresh off the Bus', 0,     0, null),
  (1, 'Corner Hustler',    100,   1, null),
  (2, 'Getaway Driver',    300,   1, null),
  (3, 'Made Member',       700,   2, 'profile flair'),
  (4, 'Heist Crew',        1500,  2, 'contributor badge'),
  (5, 'Lieutenant',        3000,  3, 'free Premium'),
  (6, 'Underboss',         6000,  3, 'free Premium'),
  (7, 'Shot Caller',       12000, 4, 'can verify contributions (moderator)'),
  (8, 'Kingpin',           25000, 5, null),
  (9, 'City Legend',       50000, 5, 'hall of fame');

-- Moderator threshold: Shot Caller (tier 7) and above.
create or replace function rank_is_moderator(p_rank int)
returns boolean language sql immutable as $$
  select p_rank >= 7;
$$;

-- ============================================================================
-- PROFILES — one row per authed user, linked to Discord
-- ============================================================================
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  handle        text unique not null,
  discord_id    text unique,
  avatar_url    text,
  respect       int  not null default 0,
  rank_id       int  not null default 0 references ranks(id),
  is_moderator  boolean not null default false,
  is_pro        boolean not null default false,   -- Premium (paid or perk-unlocked)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger profiles_updated before update on profiles
  for each row execute function set_updated_at();

-- Recompute a profile's rank + moderator + perk-based Pro from its respect total.
create or replace function recompute_rank(p_profile uuid)
returns void language plpgsql security definer as $$
declare
  v_respect int;
  v_rank    int;
begin
  select respect into v_respect from profiles where id = p_profile;

  select id into v_rank
  from ranks
  where min_respect <= v_respect
  order by min_respect desc
  limit 1;

  update profiles
  set rank_id      = v_rank,
      is_moderator = rank_is_moderator(v_rank),
      -- free Premium unlocks at Lieutenant (tier 5); never downgrade a paid Pro.
      is_pro       = is_pro or (v_rank >= 5)
  where id = p_profile;
end $$;

-- ============================================================================
-- RESPECT — contribution types, the ledger, and the award engine
-- ============================================================================
create table contribution_types (
  key     text primary key,
  label   text not null,
  points  int  not null
);

insert into contribution_types (key, label, points) values
  ('accepted_guide',     'Accepted guide',        100),
  ('confirmed_location', 'Confirmed location',    25),
  ('verified_correction','Verified correction',   15),
  ('upvoted_answer',     'Upvoted answer',        10),
  ('confirm_submission', 'Confirmed a submission', 3);

-- Immutable ledger of every Respect movement (audit trail).
create table respect_events (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  points      int  not null,
  reason      text not null,
  ref         text,                       -- optional pointer to the thing awarded for
  created_at  timestamptz not null default now()
);
create index respect_events_profile_idx on respect_events (profile_id, created_at desc);

-- Award Respect: write the ledger row, bump the total, recompute the rank.
create or replace function award_respect(
  p_profile uuid, p_points int, p_reason text, p_ref text default null
) returns void language plpgsql security definer as $$
begin
  insert into respect_events (profile_id, points, reason, ref)
  values (p_profile, p_points, p_reason, p_ref);

  update profiles set respect = respect + p_points where id = p_profile;

  perform recompute_rank(p_profile);
end $$;

-- ============================================================================
-- CONTRIBUTIONS — the verification gate. Respect is awarded ONLY on 'accepted'.
-- ============================================================================
create table contributions (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid not null references profiles(id) on delete cascade,
  type_key       text not null references contribution_types(key),
  status         text not null default 'pending'
                   check (status in ('pending','accepted','rejected')),
  payload        jsonb,                    -- what was submitted
  reviewed_by    uuid references profiles(id),
  created_at     timestamptz not null default now(),
  reviewed_at    timestamptz
);
create index contributions_status_idx on contributions (status, created_at desc);

-- When a contribution flips to 'accepted', award the type's points once.
create or replace function on_contribution_accepted()
returns trigger language plpgsql security definer as $$
declare
  v_points int;
begin
  if new.status = 'accepted' and old.status is distinct from 'accepted' then
    select points into v_points from contribution_types where key = new.type_key;
    perform award_respect(new.profile_id, v_points, 'contribution:' || new.type_key, new.id::text);
    new.reviewed_at = now();
  end if;
  return new;
end $$;

create trigger contributions_accepted before update on contributions
  for each row execute function on_contribution_accepted();

-- ============================================================================
-- CROWDSOURCED CONTENT — games, collectibles, the map, and per-user progress
-- ============================================================================
create table games (
  id     uuid primary key default gen_random_uuid(),
  slug   text unique not null,
  name   text not null
);

create table collectible_types (
  id     uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  slug   text not null,
  name   text not null,
  colour text,                             -- map pin colour
  unique (game_id, slug)
);

-- Map pins: community-submitted, start 'pending', go 'verified' once confirmed.
create table map_pins (
  id                uuid primary key default gen_random_uuid(),
  collectible_type  uuid not null references collectible_types(id) on delete cascade,
  name              text,
  region            text,
  lat               numeric not null,       -- coordinate in our own map space
  lng               numeric not null,
  status            text not null default 'pending'
                      check (status in ('pending','verified','rejected')),
  submitted_by      uuid references profiles(id),
  confirmations     int not null default 0,
  created_at        timestamptz not null default now()
);
create index map_pins_type_status_idx on map_pins (collectible_type, status);

-- What each user has found / completed.
create table user_progress (
  profile_id  uuid not null references profiles(id) on delete cascade,
  pin_id      uuid not null references map_pins(id) on delete cascade,
  found_at    timestamptz not null default now(),
  primary key (profile_id, pin_id)
);

-- ============================================================================
-- EDITORIAL CONTENT — categories, guides, articles, and the tracker link
-- ============================================================================
create table categories (
  slug  text primary key,
  name  text not null
);

insert into categories (slug, name) values
  ('beginner','Beginner'), ('money','Money'), ('collectibles','Collectibles'),
  ('missions','Missions'), ('vehicles','Vehicles'), ('map','Map'), ('news','News');

create table guides (
  id             uuid primary key default gen_random_uuid(),
  slug           text unique not null,
  title          text not null,
  kicker         text,
  category_slug  text references categories(slug),
  excerpt        text,
  body           jsonb,                    -- block content; swap for MDX later
  gradient       text,                     -- original placeholder hero treatment
  reading_mins   int default 5,
  is_new         boolean default false,
  published      boolean default true,
  updated_at     timestamptz not null default now()
);
create trigger guides_updated before update on guides
  for each row execute function set_updated_at();

create table articles (
  id             uuid primary key default gen_random_uuid(),
  slug           text unique not null,
  title          text not null,
  kicker         text,
  category_slug  text references categories(slug),
  excerpt        text,
  body           jsonb,
  gradient       text,
  reading_mins   int default 5,
  is_new         boolean default false,
  published      boolean default true,
  updated_at     timestamptz not null default now()
);
create trigger articles_updated before update on articles
  for each row execute function set_updated_at();

-- The editorial <-> tracker join: a guide maps to a collectible set,
-- so the app can show progress on the guide and surface "guides for what you're missing".
create table guide_links (
  guide_id          uuid not null references guides(id) on delete cascade,
  collectible_type  uuid not null references collectible_types(id) on delete cascade,
  primary key (guide_id, collectible_type)
);

-- ============================================================================
-- CLIP SUBMISSIONS — the consent record behind the Clip Licence.
-- Stores the link + who agreed to which terms version and when (audit trail).
-- ============================================================================
create table clip_submissions (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid not null references profiles(id) on delete cascade,
  source         text not null default 'youtube'          -- youtube | tiktok | medal | upload ...
                   check (source in ('youtube','tiktok','medal','streamable','upload','other')),
  video_id       text not null,                            -- the hosted video id / ref, not the file
  caption        text,
  category       text,
  comp_entry     boolean not null default false,           -- Clip of the Month?
  terms_version  text not null,                            -- which licence they agreed to
  agreed_at      timestamptz not null default now(),       -- when consent was given
  votes          int not null default 0,
  status         text not null default 'pending'
                   check (status in ('pending','featured','removed')),
  created_at     timestamptz not null default now()
);
create index clip_submissions_status_idx on clip_submissions (status, votes desc);

-- ============================================================================
-- LEADERBOARDS
-- ============================================================================
create view leaderboard_all as
  select p.id, p.handle, p.avatar_url, p.respect, r.name as rank_name, r.id as rank_id
  from profiles p join ranks r on r.id = p.rank_id
  order by p.respect desc;

create view leaderboard_week as
  select p.id, p.handle, p.avatar_url,
         coalesce(sum(e.points), 0) as respect_week
  from profiles p
  left join respect_events e
    on e.profile_id = p.id and e.created_at > now() - interval '7 days'
  group by p.id, p.handle, p.avatar_url
  order by respect_week desc;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table profiles          enable row level security;
alter table contributions     enable row level security;
alter table respect_events    enable row level security;
alter table map_pins          enable row level security;
alter table user_progress     enable row level security;
alter table clip_submissions  enable row level security;

-- Content + reference tables are world-readable; writes happen via service role.
alter table guides             enable row level security;
alter table articles           enable row level security;
alter table categories         enable row level security;
alter table games              enable row level security;
alter table collectible_types  enable row level security;
alter table ranks              enable row level security;
alter table contribution_types enable row level security;

-- public read
create policy "read guides"        on guides            for select using (published);
create policy "read articles"      on articles          for select using (published);
create policy "read categories"    on categories        for select using (true);
create policy "read games"         on games             for select using (true);
create policy "read collectibles"  on collectible_types for select using (true);
create policy "read ranks"         on ranks             for select using (true);
create policy "read ctypes"        on contribution_types for select using (true);
create policy "read profiles"      on profiles          for select using (true);
create policy "read verified pins" on map_pins          for select using (status = 'verified' or submitted_by = auth.uid());
create policy "read featured clips" on clip_submissions for select using (status = 'featured' or profile_id = auth.uid());

-- owner writes
create policy "update own profile"  on profiles         for update using (id = auth.uid());
create policy "insert own progress" on user_progress    for insert with check (profile_id = auth.uid());
create policy "read own progress"   on user_progress    for select using (profile_id = auth.uid());
create policy "delete own progress" on user_progress    for delete using (profile_id = auth.uid());
create policy "insert own contrib"  on contributions    for insert with check (profile_id = auth.uid());
create policy "read own contrib"    on contributions    for select using (profile_id = auth.uid() or (select is_moderator from profiles where id = auth.uid()));
create policy "submit pins"         on map_pins         for insert with check (submitted_by = auth.uid());
create policy "read own respect"    on respect_events   for select using (profile_id = auth.uid());
create policy "submit clips"        on clip_submissions for insert with check (profile_id = auth.uid());

-- Moderators (Shot Caller+) can review contributions and verify pins.
create policy "mods review contrib" on contributions for update
  using ((select is_moderator from profiles where id = auth.uid()));
create policy "mods verify pins"    on map_pins for update
  using ((select is_moderator from profiles where id = auth.uid()));

-- ============================================================================
-- Notes / extension points:
--  * seasons (reset weekly leaderboards into a seasons table),
--  * clip votes -> award_respect on featured,
--  * stripe: a subscriptions table + webhook that flips profiles.is_pro,
--  * a trigger to bump map_pins.confirmations and auto-verify at N confirmations.
-- ============================================================================
