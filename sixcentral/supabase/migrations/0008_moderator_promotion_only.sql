-- ============================================================================
--  SixCentral — 0008: moderator status is promote-only (applied live 2 Jul 2026)
--  Live-test bug: recompute_rank() hard-assigned is_moderator from rank, so
--  any Respect award wiped manually granted moderator status (the founding
--  moderator un-crowned himself by accepting the first contribution).
--  Fix mirrors is_pro: the ladder only ever grants; humans revoke deliberately.
-- ============================================================================
create or replace function public.recompute_rank(p_profile uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_respect int;
  v_rank    int;
begin
  select respect into v_respect from profiles where id = p_profile;
  select id into v_rank from ranks
  where min_respect <= v_respect order by min_respect desc limit 1;

  update profiles
  set rank_id      = v_rank,
      is_moderator = is_moderator or rank_is_moderator(v_rank),
      is_pro       = is_pro or (v_rank >= 5)
  where id = p_profile;
end $$;
