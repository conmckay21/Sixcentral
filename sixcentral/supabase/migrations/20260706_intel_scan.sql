-- ============================================================================
--  SixCentral - Intel scan (daily GTA news / leaks / rumour aggregation)
--  Source of truth for the staff editorial desk. Safe to run more than once.
--  Rename to fit your migration numbering if you apply via the CLI, or paste
--  straight into the Supabase SQL editor.
-- ============================================================================

-- Staff flag (same one the map bypass uses). No-op if it already exists.
alter table profiles add column if not exists is_staff boolean not null default false;

create table if not exists intel_items (
  id             uuid primary key default gen_random_uuid(),
  fingerprint    text unique not null,          -- clusters the same story across runs
  first_seen_at  timestamptz not null default now(),
  last_seen_at   timestamptz not null default now(),
  published_at   timestamptz,                   -- earliest source publish time
  title          text not null,
  summary        text,
  key_points     jsonb not null default '[]'::jsonb,
  origin         text,                          -- outlet the lead came from
  source_tier    smallint not null default 4,   -- 1 official .. 4 unverified
  spread_count   integer  not null default 1,   -- distinct outlets carrying it
  sources        jsonb    not null default '[]'::jsonb,
  corroborated   boolean  not null default false,
  strength_score numeric  not null default 0,   -- confidence in the claim (0-100)
  rank_score     numeric  not null default 0,   -- editorial priority (sort key)
  auto_category  text     not null default 'rumour',
  -- Human-owned columns. The scan never overwrites these once set:
  category       text not null default 'rumour'
                   check (category in ('confirmed','rumour','leak','controversy','debunk')),
  editorial_call text not null default 'analysis'
                   check (editorial_call in ('run','analysis','hold','debunk')),
  status         text not null default 'new'
                   check (status in ('new','reviewing','drafting','published','dismissed')),
  notes          text,
  pinned         boolean not null default false
);
create index if not exists intel_items_rank   on intel_items (pinned desc, rank_score desc);
create index if not exists intel_items_cat     on intel_items (category);
create index if not exists intel_items_status  on intel_items (status);

create table if not exists intel_runs (
  id             bigint generated always as identity primary key,
  ran_at         timestamptz not null default now(),
  ok             boolean not null default true,
  raw_count      integer not null default 0,
  items_inserted integer not null default 0,
  items_updated  integer not null default 0,
  sources_polled integer not null default 0,
  duration_ms    integer not null default 0,
  error          text
);
create index if not exists intel_runs_time on intel_runs (ran_at desc);

-- ---------------------------------------------------------------------------
--  Row level security: staff only. The scan writes with the service role,
--  which bypasses RLS, so no insert policy is needed for the cron.
-- ---------------------------------------------------------------------------
alter table intel_items enable row level security;
alter table intel_runs  enable row level security;

drop policy if exists "intel staff read" on intel_items;
create policy "intel staff read" on intel_items for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_staff));

drop policy if exists "intel staff update" on intel_items;
create policy "intel staff update" on intel_items for update
  using      (exists (select 1 from profiles p where p.id = auth.uid() and p.is_staff))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.is_staff));

drop policy if exists "intel runs staff read" on intel_runs;
create policy "intel runs staff read" on intel_runs for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_staff));
