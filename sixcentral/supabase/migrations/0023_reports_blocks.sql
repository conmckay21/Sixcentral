-- ============================================================================
--  SixCentral — 0023 (applied live 3 Jul 2026)
--  Report a clip, block a user. Apple 1.2 UGC requirements.
--  Three distinct unresolved reporters auto-flag an approved clip out of every
--  feed; blocks sever friendships and are enforced server-side on friend
--  requests and shares, not just hidden in the client.
-- ============================================================================

alter table clip_submissions drop constraint if exists clip_status_valid;
alter table clip_submissions add constraint clip_status_valid
  check (status in ('pending','approved','rejected','flagged'));

create table if not exists clip_reports (
  id uuid primary key default gen_random_uuid(),
  clip_id uuid not null references clip_submissions(id) on delete cascade,
  reporter uuid not null references profiles(id) on delete cascade,
  reason text not null check (reason in ('not_gta','offensive','spam','other')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references profiles(id) on delete set null,
  unique (clip_id, reporter)
);
alter table clip_reports enable row level security;
drop policy if exists clip_reports_insert_own on clip_reports;
create policy clip_reports_insert_own on clip_reports
  for insert with check (auth.uid() = reporter);
drop policy if exists clip_reports_staff_read on clip_reports;
create policy clip_reports_staff_read on clip_reports
  for select using (exists (select 1 from profiles p where p.id = auth.uid() and (p.is_staff or p.is_moderator)));
drop policy if exists clip_reports_staff_update on clip_reports;
create policy clip_reports_staff_update on clip_reports
  for update using (exists (select 1 from profiles p where p.id = auth.uid() and (p.is_staff or p.is_moderator)));

create table if not exists user_blocks (
  blocker uuid not null references profiles(id) on delete cascade,
  blocked uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);
alter table user_blocks enable row level security;
drop policy if exists user_blocks_own_all on user_blocks;
create policy user_blocks_own_all on user_blocks
  for all using (auth.uid() = blocker) with check (auth.uid() = blocker);

create or replace function flag_reported_clip() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(distinct reporter) from clip_reports
      where clip_id = new.clip_id and resolved_at is null) >= 3 then
    update clip_submissions set status = 'flagged'
      where id = new.clip_id and status = 'approved';
  end if;
  return new;
end $$;
drop trigger if exists trg_flag_reported_clip on clip_reports;
create trigger trg_flag_reported_clip after insert on clip_reports
  for each row execute function flag_reported_clip();

create or replace function guard_block_friendship() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from user_blocks
             where (blocker = new.requester and blocked = new.addressee)
                or (blocker = new.addressee and blocked = new.requester)) then
    raise exception 'BLOCKED_PAIR';
  end if;
  return new;
end $$;
drop trigger if exists trg_guard_block_friendship on friendships;
create trigger trg_guard_block_friendship before insert on friendships
  for each row execute function guard_block_friendship();

create or replace function guard_block_share() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from user_blocks
             where (blocker = new.to_profile and blocked = new.from_profile)
                or (blocker = new.from_profile and blocked = new.to_profile)) then
    raise exception 'BLOCKED_PAIR';
  end if;
  return new;
end $$;
drop trigger if exists trg_guard_block_share on clip_shares;
create trigger trg_guard_block_share before insert on clip_shares
  for each row execute function guard_block_share();

create or replace function sever_on_block() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from friendships
    where (requester = new.blocker and addressee = new.blocked)
       or (requester = new.blocked and addressee = new.blocker);
  return new;
end $$;
drop trigger if exists trg_sever_on_block on user_blocks;
create trigger trg_sever_on_block after insert on user_blocks
  for each row execute function sever_on_block();

create index if not exists idx_clip_reports_open on clip_reports (clip_id) where resolved_at is null;
