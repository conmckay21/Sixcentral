alter table public.articles add column if not exists published_at timestamptz;

update public.articles set published_at = updated_at where published = true and published_at is null;

create or replace function public.set_article_published_at()
returns trigger language plpgsql as $$
begin
  if new.published = true and (old.published is distinct from true) and new.published_at is null then
    new.published_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_article_published_at on public.articles;
create trigger trg_article_published_at
before update on public.articles
for each row execute function public.set_article_published_at();
