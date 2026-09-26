-- NDRAAAID Media Manager migration
-- Run this if you already installed the older NDRAAAID schema.

alter table public.game_products add column if not exists image_url text;

create table if not exists public.media_assets(
  id uuid primary key default gen_random_uuid(),
  name text not null,
  path text unique not null,
  url text not null,
  category text not null default 'general',
  mime_type text,
  size_bytes bigint,
  alt_text text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.media_assets enable row level security;
drop policy if exists media_public on public.media_assets;
drop policy if exists media_admin on public.media_assets;
create policy media_public on public.media_assets for select using(true);
create policy media_admin on public.media_assets for all using(public.is_admin()) with check(public.is_admin());

insert into storage.buckets(id,name,public) values('website-assets','website-assets',true) on conflict(id) do update set public=excluded.public;

drop policy if exists website_assets_admin_insert on storage.objects;
drop policy if exists website_assets_admin_update on storage.objects;
drop policy if exists website_assets_admin_delete on storage.objects;
create policy website_assets_admin_insert on storage.objects for insert to authenticated with check(bucket_id='website-assets' and public.is_admin());
create policy website_assets_admin_update on storage.objects for update to authenticated using(bucket_id='website-assets' and public.is_admin()) with check(bucket_id='website-assets' and public.is_admin());
create policy website_assets_admin_delete on storage.objects for delete to authenticated using(bucket_id='website-assets' and public.is_admin());
