-- NDRAAAID Live Broadcast migration
-- Run this once in Supabase SQL Editor if your database was created before the broadcasts feature was added.

create table if not exists public.broadcasts(
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  type text not null default 'PROMO' check(type in ('INFO','PROMO','WARNING','SUCCESS')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  link_url text,
  link_label text,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(ends_at > starts_at)
);

alter table public.broadcasts enable row level security;

drop policy if exists "public can read active broadcasts" on public.broadcasts;
drop policy if exists "staff can read broadcasts" on public.broadcasts;
drop policy if exists "admins can insert broadcasts" on public.broadcasts;
drop policy if exists "admins can update broadcasts" on public.broadcasts;
drop policy if exists "admins can delete broadcasts" on public.broadcasts;

create policy "public can read active broadcasts" on public.broadcasts for select using (is_active=true and starts_at<=now() and ends_at>now());
create policy "staff can read broadcasts" on public.broadcasts for select using (is_admin());
create policy "admins can insert broadcasts" on public.broadcasts for insert with check (is_admin() and created_by=auth.uid());
create policy "admins can update broadcasts" on public.broadcasts for update using (is_admin()) with check (is_admin());
create policy "admins can delete broadcasts" on public.broadcasts for delete using (is_admin());

do $$ begin
  alter publication supabase_realtime add table public.broadcasts;
exception when duplicate_object then null; when undefined_object then null; end $$;
