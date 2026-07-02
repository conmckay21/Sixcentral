-- ============================================================================
--  SixCentral — 0003: security hardening (Supabase advisor findings)
--  Already applied to the live project on 2 Jul 2026; kept here as the record.
-- ============================================================================

-- 1) Internal functions must not be callable through the public API.
revoke execute on function award_respect(uuid, int, text, text) from public, anon, authenticated;
revoke execute on function recompute_rank(uuid)                 from public, anon, authenticated;
revoke execute on function on_contribution_accepted()           from public, anon, authenticated;
revoke execute on function rank_is_moderator(int)               from public, anon, authenticated;
revoke execute on function set_updated_at()                     from public, anon, authenticated;

-- 2) Pin search_path on all functions (SECURITY DEFINER hygiene).
alter function set_updated_at()                       set search_path = public;
alter function rank_is_moderator(int)                 set search_path = public;
alter function recompute_rank(uuid)                   set search_path = public;
alter function award_respect(uuid, int, text, text)   set search_path = public;
alter function on_contribution_accepted()             set search_path = public;

-- 3) guide_links: reference data — RLS on, world-readable, service-role writes.
alter table guide_links enable row level security;
create policy "read guide links" on guide_links for select using (true);

-- 4) Leaderboards run as the querying user; the Respect ledger is public
--    (it powers a public leaderboard by design — nothing private in it).
alter view leaderboard_all  set (security_invoker = true);
alter view leaderboard_week set (security_invoker = true);
drop policy "read own respect" on respect_events;
create policy "read respect events" on respect_events for select using (true);
