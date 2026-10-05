-- NDRAAAID.v1: public Banner Promo + Admin Broadcast delete/manage
-- Aman dijalankan setelah migration content_type Banner Promo sebelumnya.

-- ============================================================
-- 1) BANNER PROMO: pengunjung Home boleh membaca promo aktif.
--    Admin/Owner tetap menjadi satu-satunya pihak yang mengelola.
-- ============================================================

alter table public.promotions enable row level security;

grant select on public.promotions to anon, authenticated;

 drop policy if exists promotions_public on public.promotions;
 drop policy if exists promotions_admin on public.promotions;

create policy promotions_public
on public.promotions
for select
to anon, authenticated
using (is_active = true);

create policy promotions_admin
on public.promotions
for all
to authenticated
using (public.has_permission('marketing.manage'))
with check (public.has_permission('marketing.manage'));

-- ============================================================
-- 2) LIVE BROADCAST: pengunjung hanya membaca broadcast aktif
--    yang sedang berada dalam waktu tayang. Admin/Owner dapat
--    membuat, mengubah status, dan menghapus riwayat broadcast.
-- ============================================================

alter table public.broadcasts enable row level security;

grant select on public.broadcasts to anon, authenticated;
grant insert, update, delete on public.broadcasts to authenticated;

drop policy if exists broadcasts_public on public.broadcasts;
drop policy if exists broadcasts_admin on public.broadcasts;

create policy broadcasts_public
on public.broadcasts
for select
to anon, authenticated
using (
  is_active = true
  and (starts_at is null or now() >= starts_at)
  and (ends_at is null or now() <= ends_at)
);

create policy broadcasts_admin
on public.broadcasts
for all
to authenticated
using (public.has_permission('broadcast.manage'))
with check (public.has_permission('broadcast.manage'));
