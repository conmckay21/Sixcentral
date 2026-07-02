-- ============================================================================
--  SixCentral — 0007: Discord acceptance webhook (applied live 2 Jul 2026)
--  NOTE: the live trigger carries the real shared secret; this repo copy
--  uses a placeholder. If ever re-applying, substitute the real value
--  (stored in the password manager alongside the Vercel env vars).
-- ============================================================================
create extension if not exists pg_net with schema extensions;

create or replace function public.notify_discord_acceptance()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
begin
  perform net.http_post(
    url := 'https://sixcentral.co.uk/api/discord/contribution-accepted',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', '<DISCORD_WEBHOOK_SECRET>'
    ),
    body := jsonb_build_object(
      'type', 'UPDATE', 'table', 'contributions',
      'record', to_jsonb(NEW), 'old_record', to_jsonb(OLD)
    ),
    timeout_milliseconds := 5000
  );
  return NEW;
end $$;

drop trigger if exists contributions_accepted_discord on contributions;
create trigger contributions_accepted_discord
  after update on contributions
  for each row
  when (OLD.status = 'pending' and NEW.status = 'accepted')
  execute function public.notify_discord_acceptance();

revoke execute on function public.notify_discord_acceptance() from public, anon, authenticated;
