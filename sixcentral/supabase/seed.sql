-- ============================================================================
-- SixCentral — seed data (run after 0001_init.sql)
-- Ranks, categories and contribution_types are seeded in the migration itself.
-- This adds a sample game, collectible types and starter content.
-- ============================================================================

-- Game --------------------------------------------------------------------
insert into games (slug, name) values ('gta6', 'Grand Theft Auto VI')
on conflict (slug) do nothing;

-- Collectible types (map pin categories) ----------------------------------
insert into collectible_types (game_id, slug, name, colour)
select g.id, v.slug, v.name, v.colour
from games g,
  (values
    ('hidden-packages', 'Hidden Packages', '#FF2E88'),
    ('stunt-jumps',     'Stunt Jumps',     '#1FE5D6'),
    ('businesses',      'Businesses',      '#FFC83D'),
    ('signal-towers',   'Signal Towers',   '#8A4FFF')
  ) as v(slug, name, colour)
where g.slug = 'gta6'
on conflict (game_id, slug) do nothing;

-- Starter guides ----------------------------------------------------------
insert into guides (slug, title, kicker, category_slug, excerpt, gradient, reading_mins, is_new, body)
values
  ('your-first-ten-hours', 'Your first ten hours in Leonida', 'Beginner', 'beginner',
   'A spoiler-safe path through the opening.', 'linear-gradient(150deg,#FF2E88,#8A4FFF 60%,#1FE5D6)', 11, false,
   '[{"type":"p","text":"The opening hours set the tone. This guide keeps things spoiler-safe."}]'::jsonb),
  ('all-hidden-package-locations', 'All hidden package locations & map', 'Collectibles', 'collectibles',
   'Every hidden package on our original interactive map.', 'linear-gradient(150deg,#FF2E88,#FF9E45 60%,#FFC83D)', 11, false,
   '[{"type":"p","text":"Hidden packages are the classic completionist grind."}]'::jsonb)
on conflict (slug) do nothing;

-- Link the hidden-packages guide to its collectible type (editorial <-> tracker)
insert into guide_links (guide_id, collectible_type)
select gd.id, ct.id
from guides gd
join games g on g.slug = 'gta6'
join collectible_types ct on ct.game_id = g.id and ct.slug = 'hidden-packages'
where gd.slug = 'all-hidden-package-locations'
on conflict do nothing;

-- Starter articles --------------------------------------------------------
insert into articles (slug, title, kicker, category_slug, excerpt, gradient, reading_mins, is_new, body)
values
  ('everything-confirmed', 'GTA 6: Everything confirmed so far', 'The big read', 'news',
   'The running list of what Rockstar has officially confirmed.', 'linear-gradient(150deg,#FF2E88,#8A4FFF 55%,#1FE5D6)', 8, false,
   '[{"type":"p","text":"Our living roundup of what is officially confirmed."}]'::jsonb),
  ('which-edition-to-preorder', 'Which edition should you pre-order? (UK)', 'Buying', 'news',
   'Standard vs Ultimate, boxed vs digital, and where to pre-order.', 'linear-gradient(150deg,#1FE5D6,#8A4FFF)', 7, true,
   '[{"type":"p","text":"Two editions and a handful of UK retailers."}]'::jsonb)
on conflict (slug) do nothing;
