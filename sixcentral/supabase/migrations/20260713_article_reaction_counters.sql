alter table public.articles
  add column if not exists up_count integer not null default 0,
  add column if not exists down_count integer not null default 0;

create or replace function public.bump_article_reaction_counts()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update public.articles set
      up_count = up_count + (case when new.value = 1 then 1 else 0 end),
      down_count = down_count + (case when new.value = -1 then 1 else 0 end)
    where slug = new.article_slug;
    return new;
  elsif tg_op = 'DELETE' then
    update public.articles set
      up_count = greatest(up_count - (case when old.value = 1 then 1 else 0 end), 0),
      down_count = greatest(down_count - (case when old.value = -1 then 1 else 0 end), 0)
    where slug = old.article_slug;
    return old;
  elsif tg_op = 'UPDATE' and new.value is distinct from old.value then
    update public.articles set
      up_count = greatest(up_count + (case when new.value = 1 then 1 else 0 end) - (case when old.value = 1 then 1 else 0 end), 0),
      down_count = greatest(down_count + (case when new.value = -1 then 1 else 0 end) - (case when old.value = -1 then 1 else 0 end), 0)
    where slug = new.article_slug;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_reaction_counts on public.article_reactions;
create trigger trg_reaction_counts
after insert or update or delete on public.article_reactions
for each row execute function public.bump_article_reaction_counts();

update public.articles a set
  up_count = coalesce(r.up, 0),
  down_count = coalesce(r.down, 0)
from (
  select article_slug,
    count(*) filter (where value = 1) as up,
    count(*) filter (where value = -1) as down
  from public.article_reactions
  group by 1
) r
where r.article_slug = a.slug;
