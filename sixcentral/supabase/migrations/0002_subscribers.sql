-- ============================================================================
--  SixCentral — 0002: newsletter subscribers (the launch list)
--  Public may INSERT a signup via the anon key; the list itself is only
--  readable with the service role. Consent text is stored verbatim per row
--  (UK GDPR: provable, specific consent at the moment of signup).
-- ============================================================================

create table if not exists subscribers (
  id              uuid primary key default gen_random_uuid(),
  email           text not null unique,
  source          text not null default 'web',   -- home / footer / app / import
  consent_text    text not null,                 -- what they agreed to, verbatim
  confirmed_at    timestamptz,                   -- reserved for double opt-in
  unsubscribed_at timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists subscribers_created_idx on subscribers (created_at desc);

alter table subscribers enable row level security;

-- Anyone may join the list…
create policy "public can subscribe" on subscribers
  for insert with check (true);

-- …but no select/update/delete policies exist: reads and list management
-- happen only with the service role (exports, unsubscribes, sends).
