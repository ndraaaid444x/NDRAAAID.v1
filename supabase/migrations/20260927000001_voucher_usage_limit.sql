-- =========================================================
-- NDRAAAID.v1
-- Voucher usage limit + usage history
-- =========================================================

-- 1. Tambahkan batas penggunaan voucher
alter table public.vouchers
add column if not exists usage_limit integer;

alter table public.vouchers
drop constraint if exists vouchers_usage_limit_check;

alter table public.vouchers
add constraint vouchers_usage_limit_check
check (usage_limit is null or usage_limit > 0);


-- =========================================================
-- 2. Tabel riwayat penggunaan voucher
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
-- 3. RLS
-- =========================================================

alter table public.voucher_usages enable row level security;

drop policy if exists voucher_usages_admin_select
on public.voucher_usages;

create policy voucher_usages_admin_select
on public.voucher_usages
for select
using (public.is_admin());


-- =========================================================
-- 4. Ganti create_manual_order
--    dengan validasi limit voucher yang atomic
-- =========================================================

create or replace function public.create_manual_order(
  p_game_id uuid,
  p_product_id uuid,
  p_customer_data jsonb,
  p_payment_method_id uuid,
  p_voucher_code text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();

  prod public.game_products;
  game public.games;
  method public.payment_methods;
  wallet public.wallets;
  v public.vouchers;

  oid uuid;

  subtotal numeric;
  discount numeric := 0;
  fee numeric := 0;
  total numeric;

  before_balance numeric;
  available_balance numeric;

  voucher_usage_count integer := 0;
begin

  -- =======================================================
  -- Authentication
  -- =======================================================

  if uid is null then
    raise exception 'UNAUTHORIZED';
  end if;


  -- =======================================================
  -- Validate product
  -- =======================================================

  select *
  into prod
  from public.game_products
  where id = p_product_id
    and game_id = p_game_id
    and is_active = true;

  if prod.id is null then
    raise exception 'PRODUCT_NOT_FOUND';
  end if;


  -- =======================================================
  -- Validate game
  -- =======================================================

  select *
  into game
  from public.games
  where id = p_game_id
    and is_active = true;

  if game.id is null then
    raise exception 'GAME_NOT_FOUND';
  end if;


  -- =======================================================
  -- Validate payment method
  -- =======================================================

  select *
  into method
  from public.payment_methods
  where id = p_payment_method_id
    and is_active = true;

  if method.id is null then
    raise exception 'PAYMENT_METHOD_NOT_FOUND';
  end if;


  -- =======================================================
  -- Calculate subtotal
  -- =======================================================

  subtotal := prod.price;


  -- =======================================================
  -- Voucher
  -- =======================================================

  if p_voucher_code is not null
     and btrim(p_voucher_code) <> '' then

    /*
      FOR UPDATE penting.

      Jika dua customer memakai voucher yang sama
      secara bersamaan, database akan mengunci voucher
      sehingga limit tidak bisa terlewati.
    */

    select *
    into v
    from public.vouchers
    where upper(code) = upper(btrim(p_voucher_code))
      and is_active = true
      and (starts_at is null or now() >= starts_at)
      and (ends_at is null or now() <= ends_at)
      and subtotal >= min_order
    limit 1
    for update;


    if v.id is null then
      raise exception 'INVALID_VOUCHER';
    end if;


    -- =====================================================
    -- Hitung penggunaan voucher
    -- =====================================================

    select count(*)::integer
    into voucher_usage_count
    from public.voucher_usages
    where voucher_id = v.id;


    -- =====================================================
    -- Cek limit
    -- =====================================================

    if v.usage_limit is not null
       and voucher_usage_count >= v.usage_limit then

      raise exception 'VOUCHER_USAGE_LIMIT_REACHED';

    end if;


    -- =====================================================
    -- Hitung diskon
    -- =====================================================

    if v.discount_type = 'PERCENT' then

      discount := round(
        subtotal * (v.discount_value / 100),
        2
      );

    else

      discount := v.discount_value;

    end if;


    if v.max_discount is not null then
      discount := least(
        discount,
        v.max_discount
      );
    end if;


    discount := least(
      discount,
      subtotal
    );

  end if;


  -- =======================================================
  -- Total
  -- =======================================================

  total := subtotal - discount + fee;


  -- =======================================================
  -- WALLET PAYMENT
  -- =======================================================

  if upper(method.kind) = 'WALLET' then

    insert into public.wallets(user_id)
    values (uid)
    on conflict (user_id) do nothing;


    select *
    into wallet
    from public.wallets
    where user_id = uid
    for update;


    before_balance := wallet.balance;

    available_balance :=
      wallet.balance
      - coalesce(wallet.reserved_balance, 0);


    if available_balance < total then
      raise exception 'INSUFFICIENT_WALLET_BALANCE';
    end if;


    -- =====================================================
    -- Create paid order
    -- =====================================================

    insert into public.orders(
      order_code,
      user_id,
      game_id,
      status,
      subtotal,
      discount,
      admin_fee,
      total,
      customer_data,
      voucher_code
    )
    values(
      public.make_order_code(),
      uid,
      p_game_id,
      'PAYMENT_RECEIVED',
      subtotal,
      discount,
      fee,
      total,
      coalesce(p_customer_data, '{}'),
      nullif(btrim(p_voucher_code), '')
    )
    returning id into oid;


    -- =====================================================
    -- Order item
    -- =====================================================

    insert into public.order_items(
      order_id,
      product_id,
      product_name,
      sku,
      quantity,
      unit_price
    )
    values(
      oid,
      prod.id,
      prod.name,
      prod.sku,
      1,
      prod.price
    );


    -- =====================================================
    -- Payment
    -- =====================================================

    insert into public.payments(
      order_id,
      payment_method_id,
      amount,
      status
    )
    values(
      oid,
      method.id,
      total,
      'PAID'
    );


    -- =====================================================
    -- Catat penggunaan voucher
    -- =====================================================

    if v.id is not null then

      insert into public.voucher_usages(
        voucher_id,
        order_id,
        user_id,
        voucher_code,
        discount_amount
      )
      values(
        v.id,
        oid,
        uid,
        v.code,
        discount
      );

    end if;


    -- =====================================================
    -- Deduct wallet
    -- =====================================================

    update public.wallets
    set
      balance = balance - total,
      updated_at = now()
    where user_id = uid;


    -- =====================================================
    -- Wallet ledger
    -- =====================================================

    insert into public.wallet_transactions(
      user_id,
      amount,
      balance_before,
      balance_after,
      type,
      reason,
      order_id,
      actor_id
    )
    values(
      uid,
      -total,
      before_balance,
      before_balance - total,
      'ORDER_PAYMENT',
      'Pembayaran order menggunakan saldo akun',
      oid,
      uid
    );


    -- =====================================================
    -- Order history
    -- =====================================================

    insert into public.order_status_history(
      order_id,
      old_status,
      new_status,
      changed_by,
      note
    )
    values(
      oid,
      null,
      'PAYMENT_RECEIVED',
      uid,
      case
        when v.id is not null
        then 'Order dibayar menggunakan saldo akun dengan voucher ' || v.code || '.'
        else 'Order dibayar menggunakan saldo akun.'
      end
    );


    -- =====================================================
    -- Notification
    -- =====================================================

    insert into public.notifications(
      user_id,
      title,
      body,
      type
    )
    values(
      uid,
      'Pembayaran berhasil',
      case
        when v.id is not null
        then 'Pembayaran order menggunakan saldo akun berhasil. Voucher ' || v.code || ' digunakan.'
        else 'Pembayaran order menggunakan saldo akun berhasil.'
      end,
      'ORDER'
    );


    return oid;

  end if;


  -- =======================================================
  -- NORMAL / MANUAL PAYMENT
  -- =======================================================

  insert into public.orders(
    order_code,
    user_id,
    game_id,
    status,
    subtotal,
    discount,
    admin_fee,
    total,
    customer_data,
    voucher_code
  )
  values(
    public.make_order_code(),
    uid,
    p_game_id,
    'PENDING_PAYMENT',
    subtotal,
    discount,
    fee,
    total,
    coalesce(p_customer_data, '{}'),
    nullif(btrim(p_voucher_code), '')
  )
  returning id into oid;


  -- =======================================================
  -- Order item
  -- =======================================================

  insert into public.order_items(
    order_id,
    product_id,
    product_name,
    sku,
    quantity,
    unit_price
  )
  values(
    oid,
    prod.id,
    prod.name,
    prod.sku,
    1,
    prod.price
  );


  -- =======================================================
  -- Payment
  -- =======================================================

  insert into public.payments(
    order_id,
    payment_method_id,
    amount,
    status
  )
  values(
    oid,
    method.id,
    total,
    'PENDING'
  );


  -- =======================================================
  -- Catat penggunaan voucher
  -- =======================================================

  if v.id is not null then

    insert into public.voucher_usages(
      voucher_id,
      order_id,
      user_id,
      voucher_code,
      discount_amount
    )
    values(
      v.id,
      oid,
      uid,
      v.code,
      discount
    );

  end if;


  -- =======================================================
  -- Order history
  -- =======================================================

  insert into public.order_status_history(
    order_id,
    old_status,
    new_status,
    changed_by,
    note
  )
  values(
    oid,
    null,
    'PENDING_PAYMENT',
    uid,
    case
      when v.id is not null
      then 'Order dibuat dengan voucher ' || v.code || '.'
      else 'Order dibuat oleh customer.'
    end
  );


  -- =======================================================
  -- Notification
  -- =======================================================

  insert into public.notifications(
    user_id,
    title,
    body,
    type
  )
  values(
    uid,
    'Order berhasil dibuat',
    case
      when v.id is not null
      then 'Order dibuat dengan voucher ' || v.code || '. Silakan lakukan pembayaran.'
      else 'Order kamu sudah dibuat. Silakan lakukan pembayaran sesuai metode yang dipilih.'
    end,
    'ORDER'
  );


  return oid;

end;
$$;


-- =========================================================
-- 5. Permissions
-- =========================================================

revoke all on function public.create_manual_order(
  uuid,
  uuid,
  jsonb,
  uuid,
  text
)
from public, anon, authenticated;


grant execute on function public.create_manual_order(
  uuid,
  uuid,
  jsonb,
  uuid,
  text
)
to authenticated;


-- =========================================================
-- 6. Kembalikan kuota ketika order CANCELLED / EXPIRED
-- =========================================================

create or replace function public.admin_transition_order(
  p_order_id uuid,
  p_new_status public.order_status,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  old public.order_status;
  uid uuid;
begin

  if not public.is_admin() then
    raise exception 'FORBIDDEN';
  end if;


  select
    status,
    user_id
  into
    old,
    uid
  from public.orders
  where id = p_order_id
  for update;


  if old is null then
    raise exception 'ORDER_NOT_FOUND';
  end if;


  if old = 'PENDING_PAYMENT'
     and p_new_status not in (
       'PAYMENT_RECEIVED',
       'CANCELLED',
       'EXPIRED'
     ) then

    raise exception 'INVALID_TRANSITION';

  end if;


  if old = 'PAYMENT_RECEIVED'
     and p_new_status not in (
       'PROCESSING',
       'FAILED',
       'CANCELLED'
     ) then

    raise exception 'INVALID_TRANSITION';

  end if;


  if old = 'PROCESSING'
     and p_new_status not in (
       'SUCCESS',
       'FAILED'
     ) then

    raise exception 'INVALID_TRANSITION';

  end if;


  update public.orders
  set
    status = p_new_status,
    updated_at = now()
  where id = p_order_id;


  if p_new_status = 'PAYMENT_RECEIVED' then

    update public.payments
    set
      status = 'PAID',
      updated_at = now()
    where order_id = p_order_id;


    update public.payment_proofs
    set verified = true
    where id = (
      select id
      from public.payment_proofs
      where order_id = p_order_id
      order by created_at desc
      limit 1
    );

  end if;


  -- =======================================================
  -- Jika order dibatalkan/expired,
  -- voucher usage dikembalikan
  -- =======================================================

  if p_new_status in ('CANCELLED', 'EXPIRED') then

    delete from public.voucher_usages
    where order_id = p_order_id;

  end if;


  insert into public.order_status_history(
    order_id,
    old_status,
    new_status,
    changed_by,
    note
  )
  values(
    p_order_id,
    old,
    p_new_status,
    actor,
    p_note
  );


  insert into public.admin_audit_logs(
    admin_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values(
    actor,
    'CHANGE_ORDER_STATUS',
    'order',
    p_order_id,
    jsonb_build_object(
      'from', old,
      'to', p_new_status,
      'note', p_note
    )
  );


  insert into public.notifications(
    user_id,
    title,
    body,
    type
  )
  values(
    uid,
    'Status order berubah',
    'Order kamu sekarang berstatus ' ||
    replace(p_new_status::text, '_', ' ') ||
    '.',
    'ORDER'
  );

end;
$$;