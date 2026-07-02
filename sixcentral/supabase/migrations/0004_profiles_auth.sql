-- ============================================================================
--  SixCentral — 0004: auth-driven profiles + privilege fix
--  Applied to the live project on 2 Jul 2026; kept here as the record.
--  (Full SQL as applied — see repo history for the canonical version.)
-- ============================================================================
-- 1) SECURITY FIX: replace unrestricted self-update with checked policy +
--    column-level grants (handle, avatar_url only).
drop policy "update own profile" on profiles;
create policy "update own profile" on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
revoke update on table profiles from anon, authenticated;
grant update (handle, avatar_url) on table profiles to authenticated;

-- 2) Handle hygiene
alter table profiles add constraint handle_format
  check (handle ~ '^[A-Za-z0-9_]{3,20}$');
create unique index if not exists profiles_handle_lower_idx
  on profiles (lower(handle));

-- 3) generate_handle(base) — sanitised, uniqueness-guaranteed (see applied SQL)
create or replace function public.generate_handle(base text)
returns text language plpgsql security definer set search_path = public as $$
declare v text; candidate text; n int := 0;
begin
  v := lower(regexp_replace(coalesce(base, ''), '[^A-Za-z0-9_]', '', 'g'));
  v := left(v, 14);
  if length(v) < 3 then v := 'player'; end if;
  candidate := v;
  while exists (select 1 from profiles where lower(handle) = lower(candidate)) loop
    n := n + 1;
    candidate := v || '_' || to_char(floor(random() * 9000 + 1000), 'FM9999');
    if n > 20 then
      candidate := 'player_' || left(replace(gen_random_uuid()::text, '-', ''), 8);
    end if;
  end loop;
  return candidate;
end $$;

-- 4) Profile on signup (avatar/name from provider metadata; Discord snowflake captured)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_handle text; v_avatar text; v_discord text;
begin
  v_avatar := NEW.raw_user_meta_data->>'avatar_url';
  select provider_id into v_discord from auth.identities
    where user_id = NEW.id and provider = 'discord' limit 1;
  v_handle := public.generate_handle(coalesce(
    NEW.raw_user_meta_data->>'user_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1), 'player'));
  insert into profiles (id, handle, avatar_url, discord_id)
  values (NEW.id, v_handle, v_avatar, v_discord)
  on conflict (id) do nothing;
  return NEW;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5) Discord identity sync on later linking
create or replace function public.sync_discord_identity()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if NEW.provider = 'discord' then
    update profiles set discord_id = NEW.provider_id,
      avatar_url = coalesce(avatar_url, NEW.identity_data->>'avatar_url')
    where id = NEW.user_id and (discord_id is null or discord_id = NEW.provider_id);
  end if;
  return NEW;
end $$;
drop trigger if exists on_identity_created on auth.identities;
create trigger on_identity_created after insert on auth.identities
  for each row execute function public.sync_discord_identity();

-- 6) Keep the functions off the public API surface
revoke execute on function public.generate_handle(text)   from public, anon, authenticated;
revoke execute on function public.handle_new_user()       from public, anon, authenticated;
revoke execute on function public.sync_discord_identity() from public, anon, authenticated;
