-- ============================================================================
--  SixCentral - link Discord identity to profile automatically
--  Applied live 6 Jul 2026. Populates profiles.discord_id whenever a Discord
--  login is attached to an account, whichever order they signed up, so the
--  bot's rank-role sync and /submit linking work for every member.
-- ============================================================================
create or replace function public.link_discord_identity()
returns trigger language plpgsql security definer set search_path = public, auth as $$
begin
  if NEW.provider = 'discord' then
    update public.profiles
      set discord_id = NEW.identity_data->>'provider_id'
      where id = NEW.user_id
        and (discord_id is null or discord_id is distinct from NEW.identity_data->>'provider_id');
  end if;
  return NEW;
end $$;

drop trigger if exists on_discord_identity_linked on auth.identities;
create trigger on_discord_identity_linked
  after insert on auth.identities
  for each row execute function public.link_discord_identity();
