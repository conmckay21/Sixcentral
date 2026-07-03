-- 0021: remote feature flags (map_live gates the map tab)
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
drop policy if exists "read app settings" on public.app_settings;
create policy "read app settings" on public.app_settings for select using (true);

insert into public.app_settings (key, value) values ('map_live', 'false'::jsonb)
on conflict (key) do nothing;
