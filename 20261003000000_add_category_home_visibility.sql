-- NDRAAAID.v1 - Add category Home visibility
-- The admin frontend uses show_on_home for category visibility on the Home page.
-- Safe for existing databases and fresh deployments.

alter table public.game_categories
  add column if not exists show_on_home boolean not null default true;

-- Existing categories remain visible on Home by default.
update public.game_categories
set show_on_home = true
where show_on_home is null;
