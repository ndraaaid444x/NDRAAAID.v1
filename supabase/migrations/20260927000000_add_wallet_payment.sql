-- NDRAAAID.v1
-- Add customer wallet payment

-- =========================================================
-- 1. Add "Saldo Akun" payment method
-- =========================================================

insert into public.payment_methods
  (name, kind, account_name, account_number, instruction, qr_url, is_active)
select
  'Saldo Akun',
  'WALLET',
  'Saldo Wallet',
  null,
  'Pembayaran menggunakan saldo akun kamu.',
  null,
  true
where not exists (
  select 1
  from public.payment_methods
  where upper(kind) = 'WALLET'
);


-- =========================================================
-- 2. Create secure order function with wallet support
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

  oid uuid;

  subtotal numeric;
  discount numeric := 0;
  fee numeric := 0;
  total numeric;

  before_balance numeric;
  available_balance numeric;

  v public.vouchers;

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
  -- Calculate price
  -- =======================================================

  subtotal := prod.price;


  if p_voucher_code is not null
     and btrim(p_voucher_code) <> '' then

    select *
    into v
    from public.vouchers
    where upper(code) = upper(btrim(p_voucher_code))
      and is_active = true
      and (starts_at is null or now() >= starts_at)
      and (ends_at is null or now() <= ends_at)
      and subtotal >= min_order
    limit 1;

    if v.id is null then
      raise exception 'INVALID_VOUCHER';
    end if;


    if v.discount_type = 'PERCENT' then
      discount := round(
        subtotal * (v.discount_value / 100),
        2
      );
    else
      discount := v.discount_value;
    end if;


    if v.max_discount is not null then
      discount := least(discount, v.max_discount);
    end if;


    discount := least(discount, subtotal);

  end if;


  total := subtotal - discount + fee;


  -- =======================================================
  -- WALLET PAYMENT
  -- =======================================================

  if upper(method.kind) = 'WALLET' then

    -- Make sure wallet exists.
    insert into public.wallets(user_id)
    values (uid)
    on conflict (user_id) do nothing;


    -- Lock wallet row so two simultaneous purchases
    -- cannot spend the same balance.
    select *
    into wallet
    from public.wallets
    where user_id = uid
    for update;


    before_balance := wallet.balance;

    available_balance :=
      wallet.balance - coalesce(wallet.reserved_balance, 0);


    if available_balance < total then
      raise exception 'INSUFFICIENT_WALLET_BALANCE';
    end if;


    -- Create the order as already paid.
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


    -- Order item.
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


    -- Payment is already paid.
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


    -- Deduct wallet balance.
    update public.wallets
    set
      balance = balance - total,
      updated_at = now()
    where user_id = uid;


    -- Record wallet ledger.
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


    -- Order history.
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
      'Order dibayar menggunakan saldo akun.'
    );


    -- Customer notification.
    insert into public.notifications(
      user_id,
      title,
      body,
      type
    )
    values(
      uid,
      'Pembayaran berhasil',
      'Pembayaran order menggunakan saldo akun berhasil. Order kamu sedang diproses.',
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
    'Order dibuat oleh customer.'
  );


  insert into public.notifications(
    user_id,
    title,
    body,
    type
  )
  values(
    uid,
    'Order berhasil dibuat',
    'Order kamu sudah dibuat. Silakan lakukan pembayaran sesuai metode yang dipilih dan upload bukti jika diperlukan.',
    'ORDER'
  );


  return oid;

end;
$$;


-- =========================================================
-- 3. Function permissions
-- =========================================================

revoke all on function public.create_manual_order(
  uuid,
  uuid,
  jsonb,
  uuid,
  text
) from public, anon, authenticated;

grant execute on function public.create_manual_order(
  uuid,
  uuid,
  jsonb,
  uuid,
  text
) to authenticated;