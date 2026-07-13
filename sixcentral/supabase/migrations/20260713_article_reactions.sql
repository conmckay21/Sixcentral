create table if not exists public.article_reactions (
  id uuid primary key default gen_random_uuid(),
  article_slug text not null,
  profile_id uuid references public.profiles(id) on delete cascade,
  anon_id text,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (profile_id is not null or anon_id is not null)
);

create unique index if not exists article_reactions_profile_uq
  on public.article_reactions (article_slug, profile_id) where profile_id is not null;
create unique index if not exists article_reactions_anon_uq
  on public.article_reactions (article_slug, anon_id) where anon_id is not null;
create index if not exists article_reactions_slug_idx
  on public.article_reactions (article_slug);

alter table public.article_reactions enable row level security;
