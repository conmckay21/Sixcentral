-- ============================================================================
--  SixCentral — 0006: web contribution intake + premium enforcement pattern
--  (Applied live 2 Jul 2026.)
-- ============================================================================
insert into contribution_types (key, label, points)
values ('intel', 'Verified intel', 15) on conflict (key) do nothing;

drop policy "insert own contrib" on contributions;
create policy "insert own contrib" on contributions
  for insert with check (profile_id = auth.uid() and status = 'pending' and reviewed_by is null);

drop policy "mods review contrib" on contributions;
create policy "mods review contrib" on contributions
  for update
  using ((select is_moderator from profiles where id = auth.uid()))
  with check ((select is_moderator from profiles where id = auth.uid()));

create or replace function public.enforce_free_tracking_cap()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_pro boolean; v_count int;
begin
  select is_pro into v_pro from profiles where id = NEW.profile_id;
  if coalesce(v_pro, false) then return NEW; end if;
  select count(*) into v_count from user_progress where profile_id = NEW.profile_id;
  if v_count >= 100 then
    raise exception 'FREE_LIMIT: free accounts track up to 100 items. Premium tracks everything.'
      using errcode = 'P0001';
  end if;
  return NEW;
end $$;
drop trigger if exists user_progress_free_cap on user_progress;
create trigger user_progress_free_cap before insert on user_progress
  for each row execute function public.enforce_free_tracking_cap();
revoke execute on function public.enforce_free_tracking_cap() from public, anon, authenticated;
