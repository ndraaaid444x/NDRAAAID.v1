-- =========================================================
-- NDRAAAID.v1
-- Voucher limits + usage history
-- =========================================================

-- =========================================================
-- 1. Tambahkan data limit ke voucher
-- =========================================================

alter table public.vouchers
  add column if not exists initial_limit bigint;

alter table public.vouchers
  add column if not exists usage_limit bigint;

alter table public.vouchers
  add column if not exists usage_count bigint not null default 0;

alter table public.vouchers
  drop constraint if exists vouchers_initial_limit_check;

alter table public.vouchers
  add constraint vouchers_initial_limit_check
  check (initial_limit is null or initial_limit >= 0);

alter table public.vouchers
  drop constraint if exists vouchers_usage_limit_check;

alter table public.vouchers
  add constraint vouchers_usage_limit_check
  check (usage_limit is null or usage_limit >= 0);

alter table public.vouchers
  drop constraint if exists vouchers_usage_count_check;

alter table public.vouchers
  add constraint vouchers_usage_count_check
  check (usage_count >= 0);


-- =========================================================
-- 2. Voucher yang sudah ada
--    NULL = tanpa batas
-- =========================================================

update public.vouchers
set
  initial_limit = coalesce(initial_limit, usage_limit),
  usage_count = coalesce(usage_count, 0);


-- =========================================================
-- 3. Riwayat penggunaan voucher
-- =========================================================

create table if not exists public.voucher_usages (
  id uuid primary key default gen_random_uuid(),

  voucher_id uuid not null
    references public.vouchers(id)
    on delete cascade,

  order_id uuid not null
    references public.orders(id)
    on delete cascade,

  user_id uuid not null
    references public.profiles(id)
    on delete cascade,

  voucher_code text not null,

  discount_amount numeric(14,2) not null default 0,

  used_at timestamptz not null default now(),

  unique(voucher_id, order_id)
);


create index if not exists
voucher_usages_voucher_idx
on public.voucher_usages(voucher_id, used_at desc);


create index if not exists
voucher_usages_user_idx
on public.voucher_usages(user_id, used_at desc);


create index if not exists
voucher_usages_order_idx
on public.voucher_usages(order_id);


-- =========================================================
-- 4. RLS
-- =========================================================

alter table public.voucher_usages enable row level security;

drop policy if exists voucher_usages_admin_select
on public.voucher_usages;

create policy voucher_usages_admin_select
on public.voucher_usages
for select
using (public.is_admin());


-- =========================================================
-- 5. Trigger penggunaan voucher
--
-- Setiap order yang memiliki voucher akan:
-- - mengunci voucher
-- - mengecek limit
-- - mencatat penggunaan
-- - menambah usage_count
--
-- Jika limit habis, order otomatis ditolak.
-- =========================================================

create or replace function public.reserve_voucher_for_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.vouchers;
  current_usage bigint;
begin

  if new.voucher_code is null
     or btrim(new.voucher_code) = '' then
    return new;
  end if;


  -- Lock voucher agar dua order bersamaan
  -- tidak dapat memakai stok terakhir secara bersamaan.
  select *
  into v
  from public.vouchers
  where upper(code) = upper(btrim(new.voucher_code))
  for update;


  if v.id is null then
    raise exception 'INVALID_VOUCHER';
  end if;


  if not v.is_active then
    raise exception 'INVALID_VOUCHER';
  end if;


  if v.starts_at is not null
     and now() < v.starts_at then
    raise exception 'INVALID_VOUCHER';
  end if;


  if v.ends_at is not null
     and now() > v.ends_at then
    raise exception 'INVALID_VOUCHER';
  end if;


  current_usage := coalesce(v.usage_count, 0);


  -- Limit NULL = tidak terbatas.
  if v.usage_limit is not null
     and current_usage >= v.usage_limit then

    raise exception 'VOUCHER_USAGE_LIMIT_REACHED';

  end if;


  -- Catat penggunaan voucher.
  insert into public.voucher_usages(
    voucher_id,
    order_id,
    user_id,
    voucher_code,
    discount_amount
  )
  values(
    v.id,
    new.id,
    new.user_id,
    v.code,
    coalesce(new.discount, 0)
  );


  -- Tambah jumlah penggunaan.
  update public.vouchers
  set usage_count = coalesce(usage_count, 0) + 1
  where id = v.id;


  return new;
end;
$$;


drop trigger if exists trg_reserve_voucher_for_order
on public.orders;


create trigger trg_reserve_voucher_for_order
before insert on public.orders
for each row
execute function public.reserve_voucher_for_order();


-- =========================================================
-- 6. Jika order CANCELLED / EXPIRED
--    stok voucher dikembalikan.
-- =========================================================

create or replace function public.release_voucher_for_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  usage_row public.voucher_usages;
begin

  if new.status in ('CANCELLED', 'EXPIRED')
     and old.status not in ('CANCELLED', 'EXPIRED') then

    select *
    into usage_row
    from public.voucher_usages
    where order_id = new.id
    for update;


    if usage_row.id is not null then

      delete from public.voucher_usages
      where id = usage_row.id;


      update public.vouchers
      set usage_count = greatest(
        coalesce(usage_count, 0) - 1,
        0
      )
      where id = usage_row.voucher_id;

    end if;

  end if;


  return new;
end;
$$;


drop trigger if exists trg_release_voucher_for_order
on public.orders;


create trigger trg_release_voucher_for_order
after update of status on public.orders
for each row
execute function public.release_voucher_for_order();


-- =========================================================
-- 7. Admin/Owner boleh membaca riwayat voucher
-- =========================================================

drop policy if exists voucher_usages_admin_select
on public.voucher_usages;

create policy voucher_usages_admin_select
on public.voucher_usages
for select
using (public.is_admin());


-- =========================================================
-- 8. Admin/Owner boleh mengatur voucher
-- =========================================================

drop policy if exists vouchers_admin
on public.vouchers;

create policy vouchers_admin
on public.vouchers
for all
using (public.is_admin())
with check (public.is_admin());


-- =========================================================
-- 9. View untuk Admin Panel
--
-- Menampilkan:
-- kode
-- diskon
-- stok awal
-- terpakai
-- sisa
-- status
-- =========================================================

create or replace view public.voucher_inventory
with (id, code, discount_type, discount_value,
      initial_limit, usage_limit, usage_count,
      remaining, is_active, starts_at, ends_at)
as
select
  v.id,
  v.code,
  v.discount_type,
  v.discount_value,
  v.initial_limit,
  v.usage_limit,
  coalesce(v.usage_count, 0),

  case
    when v.usage_limit is null then null
    else greatest(
      v.usage_limit - coalesce(v.usage_count, 0),
      0
    )
  end,

  v.is_active,
  v.starts_at,
  v.ends_at
from public.vouchers v;


-- =========================================================
-- 10. View riwayat penggunaan voucher
--
-- Admin bisa mendapatkan:
-- BUDI10
-- Diskon 10%
-- User @pembeli
-- Order NDRAAAID-...
-- Diskon Rp2.000
-- Waktu penggunaan
-- =========================================================

create or replace view public.voucher_usage_history
with (
  id,
  voucher_id,
  voucher_code,
  order_id,
  order_code,
  user_id,
  username,
  name,
  discount_amount,
  order_subtotal,
  order_total,
  order_status,
  used_at
)
as
select
  vu.id,
  vu.voucher_id,
  vu.voucher_code,
  vu.order_id,
  o.order_code,
  vu.user_id,
  p.username,
  p.name,
  vu.discount_amount,
  o.subtotal,
  o.total,
  o.status,
  vu.used_at
from public.voucher_usages vu
join public.orders o
  on o.id = vu.order_id
join public.profiles p
  on p.id = vu.user_id;


-- =========================================================
-- 11. Keamanan view
-- =========================================================

revoke all
on public.voucher_inventory
from anon, authenticated;

revoke all
on public.voucher_usage_history
from anon, authenticated;


grant select
on public.voucher_inventory
to authenticated;

grant select
on public.voucher_usage_history
to authenticated;


-- =========================================================
-- SELESAI
-- =========================================================