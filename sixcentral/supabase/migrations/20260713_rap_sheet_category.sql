insert into public.categories (slug, name) values ('controversy', 'The Rap Sheet') on conflict (slug) do nothing;
