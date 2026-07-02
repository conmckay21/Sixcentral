-- ============================================================================
--  SixCentral — 0010: staff are above the ladder (applied live 2 Jul 2026)
--  Explicit staff flag — deliberately NOT derived from titles or moderator
--  status (titled community members and earned Shot-Caller mods stay on the
--  board). Staff vanish from both leaderboards; set only via service role.
-- ============================================================================
alter table profiles add column if not exists is_staff boolean not null default false;

create or replace view leaderboard_all with (security_invoker = on) as
select p.id, p.handle, p.avatar_url, p.respect, r.name as rank_name, r.id as rank_id, p.title
from profiles p join ranks r on r.id = p.rank_id
where p.is_staff = false
order by p.respect desc;

create or replace view leaderboard_week with (security_invoker = on) as
select p.id, p.handle, p.avatar_url,
       coalesce(sum(e.points), 0::bigint) as respect_week, p.title
from profiles p
left join respect_events e
  on e.profile_id = p.id and e.created_at > (now() - interval '7 days')
where p.is_staff = false
group by p.id, p.handle, p.avatar_url, p.title
order by coalesce(sum(e.points), 0::bigint) desc;
