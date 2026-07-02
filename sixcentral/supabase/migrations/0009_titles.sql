-- ============================================================================
--  SixCentral — 0009: bestowed titles (applied live 2 Jul 2026)
--  Rank is earned; a title is bestowed (Founder first). Users cannot write
--  their own title — column grants from 0004 limit self-updates to
--  handle + avatar_url. Leaderboard views recreated with title appended.
-- ============================================================================
alter table profiles add column if not exists title text;

drop view if exists leaderboard_all;
create view leaderboard_all with (security_invoker = on) as
select p.id, p.handle, p.avatar_url, p.respect, r.name as rank_name, r.id as rank_id, p.title
from profiles p join ranks r on r.id = p.rank_id
order by p.respect desc;

drop view if exists leaderboard_week;
create view leaderboard_week with (security_invoker = on) as
select p.id, p.handle, p.avatar_url,
       coalesce(sum(e.points), 0::bigint) as respect_week, p.title
from profiles p
left join respect_events e
  on e.profile_id = p.id and e.created_at > (now() - interval '7 days')
group by p.id, p.handle, p.avatar_url, p.title
order by coalesce(sum(e.points), 0::bigint) desc;
