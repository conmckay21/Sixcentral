-- 0020: DOB privacy + integrity
-- Close the base-table bypass: sensitive columns only readable via the guarded public_profiles view
revoke select (date_of_birth, psn_id, xbox_gamertag, discord_id) on public.profiles from anon, authenticated;

-- DOB integrity: set once, sane bounds, null writes preserve rather than erase
create or replace function public.enforce_dob_lock()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if TG_OP = 'UPDATE' then
    if NEW.date_of_birth is null and OLD.date_of_birth is not null then
      NEW.date_of_birth := OLD.date_of_birth;
    elsif OLD.date_of_birth is not null and NEW.date_of_birth is distinct from OLD.date_of_birth then
      raise exception 'DOB_LOCKED: date of birth can only be set once. Contact support to change it.'
        using errcode = 'P0001';
    end if;
  end if;
  if NEW.date_of_birth is not null then
    if NEW.date_of_birth > (current_date - interval '13 years') then
      raise exception 'DOB_MIN_AGE: SixCentral is for ages 13 and up.' using errcode = 'P0001';
    end if;
    if NEW.date_of_birth < date '1900-01-01' then
      raise exception 'DOB_INVALID: that date does not look right.' using errcode = 'P0001';
    end if;
  end if;
  return NEW;
end $$;

drop trigger if exists profiles_dob_lock on public.profiles;
create trigger profiles_dob_lock
  before insert or update on public.profiles
  for each row execute function public.enforce_dob_lock();
