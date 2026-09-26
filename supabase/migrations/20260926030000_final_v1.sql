-- NDRAAAID.v1 Final hardening / feature migration
-- Run AFTER the existing schema + hardening/deposit migrations.

-- 1) Brand/settings
insert into public.settings(key,value) values
('site','{"name":"NDRAAAID.v1","tagline":"Top Up Game Cepat, Aman & Terpercaya","manual_mode":true}'::jsonb)
on conflict(key) do update set value = public.settings.value || excluded.value, updated_at=now();

-- 2) Permission catalog. The co_owner enum value is added by the preceding migration.

-- 3) Permission catalog for granular administration.
create table if not exists public.permissions(
  key text primary key,
  label text not null,
  description text
);
create table if not exists public.role_permissions(
  role public.user_role not null,
  permission_key text not null references public.permissions(key) on delete cascade,
  primary key(role,permission_key)
);

insert into public.permissions(key,label) values
('admin.dashboard.view','View dashboard'),
('orders.view','View orders'),('orders.process','Process orders'),('orders.refund','Refund orders'),
('finance.view','View finance'),('finance.deposit.approve','Approve deposits'),('finance.deposit.reject','Reject deposits'),
('finance.wallet.credit','Credit wallet'),('finance.wallet.debit','Debit wallet'),
('finance.withdrawal.approve','Approve withdrawal'),('finance.withdrawal.reject','Reject withdrawal'),
('catalog.manage','Manage catalog'),('marketing.manage','Manage banners/promotions/vouchers'),
('chat.manage','Manage live chat'),('broadcast.manage','Manage live broadcast'),
('users.view','View customers'),('users.manage','Manage customers'),
('settings.manage','Manage settings'),('audit.view','View audit logs')
on conflict(key) do nothing;

insert into public.role_permissions(role,permission_key)
select 'owner'::public.user_role,key from public.permissions on conflict do nothing;
insert into public.role_permissions(role,permission_key)
select 'co_owner'::public.user_role,key from public.permissions
where key not in ('settings.manage') on conflict do nothing;
insert into public.role_permissions(role,permission_key)
select 'admin'::public.user_role,key from public.permissions
where key in ('admin.dashboard.view','orders.view','orders.process','finance.view','finance.deposit.approve','finance.deposit.reject','catalog.manage','marketing.manage','chat.manage','broadcast.manage','users.view','audit.view')
on conflict do nothing;
insert into public.role_permissions(role,permission_key) values
('customer_service','admin.dashboard.view'),('customer_service','orders.view'),('customer_service','chat.manage'),('customer_service','users.view')
on conflict do nothing;


create or replace function public.has_permission(p_key text)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.profiles p
    join public.role_permissions rp on rp.role=p.role
    where p.id=auth.uid() and p.is_suspended=false and (p.role='owner' or rp.permission_key=p_key)
  );
$$;
revoke all on function public.has_permission(text) from public,anon;
grant execute on function public.has_permission(text) to authenticated;

alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
drop policy if exists permissions_admin on public.permissions;
drop policy if exists role_permissions_owner on public.role_permissions;
create policy permissions_admin on public.permissions for select to authenticated using(public.is_admin() or public.is_owner());
create policy role_permissions_owner on public.role_permissions for select to authenticated using(public.is_owner() or public.is_admin());

-- 4) Orders support guest checkout.
alter table public.orders alter column user_id drop not null;
create index if not exists orders_user_created_idx on public.orders(user_id,created_at desc);



-- Track order must not expose arbitrary customer_data.
create or replace function public.track_order(p_order_code text)
returns table(order_code text,status public.order_status,created_at timestamptz,game_name text,total numeric)
language sql security definer set search_path=public as $$
  select o.order_code,o.status,o.created_at,g.name,o.total
  from public.orders o join public.games g on g.id=o.game_id
  where upper(o.order_code)=upper(btrim(p_order_code)) limit 1;
$$;
revoke all on function public.track_order(text) from public,anon,authenticated;
grant execute on function public.track_order(text) to anon,authenticated;

-- 5) Broadcast compatibility overload matching the previously-used frontend argument order.
create or replace function public.create_broadcast(
  p_duration_minutes integer,
  p_link_label text,
  p_link_url text,
  p_message text,
  p_title text,
  p_type text
) returns public.broadcasts
language plpgsql security definer set search_path=public as $$
declare result public.broadcasts; actor uuid:=auth.uid(); started timestamptz:=now(); mins integer:=greatest(1,least(coalesce(p_duration_minutes,60),10080));
begin
  if actor is null or not public.has_permission('broadcast.manage') then raise exception 'FORBIDDEN'; end if;
  if nullif(btrim(p_title),'') is null then raise exception 'BROADCAST_TITLE_REQUIRED'; end if;
  if nullif(btrim(p_message),'') is null then raise exception 'BROADCAST_MESSAGE_REQUIRED'; end if;
  if upper(coalesce(p_type,'PROMO')) not in ('INFO','PROMO','WARNING','SUCCESS') then raise exception 'INVALID_BROADCAST_TYPE'; end if;
  insert into public.broadcasts(title,message,type,starts_at,ends_at,link_url,link_label,is_active,created_by)
  values(btrim(p_title),btrim(p_message),upper(coalesce(p_type,'PROMO')),started,started+make_interval(mins=>mins),nullif(btrim(p_link_url),''),nullif(btrim(p_link_label),''),true,actor)
  returning * into result;
  insert into public.admin_audit_logs(admin_id,action,entity_type,entity_id,metadata) values(actor,'CREATE_BROADCAST','broadcast',result.id,jsonb_build_object('title',result.title));
  return result;
end; $$;
revoke all on function public.create_broadcast(integer,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.create_broadcast(integer,text,text,text,text,text) to authenticated;

-- 6) Secure chat room/message RPCs. This removes dependence on direct INSERT RLS from the widget.
create or replace function public.get_or_create_chat_room()
returns public.chat_rooms language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); r public.chat_rooms;
begin
  if uid is null then raise exception 'UNAUTHORIZED'; end if;
  select * into r from public.chat_rooms where user_id=uid and status='OPEN' order by created_at desc limit 1;
  if r.id is null then
    insert into public.chat_rooms(user_id,status) values(uid,'OPEN') returning * into r;
  end if;
  return r;
end; $$;
revoke all on function public.get_or_create_chat_room() from public,anon;
grant execute on function public.get_or_create_chat_room() to authenticated;

create or replace function public.send_chat_message(p_room_id uuid,p_message text)
returns public.chat_messages language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); r public.chat_rooms; m public.chat_messages;
begin
  if uid is null then raise exception 'UNAUTHORIZED'; end if;
  if length(btrim(coalesce(p_message,'')))<1 then raise exception 'MESSAGE_REQUIRED'; end if;
  if length(p_message)>2000 then raise exception 'MESSAGE_TOO_LONG'; end if;
  select * into r from public.chat_rooms where id=p_room_id for update;
  if r.id is null then raise exception 'ROOM_NOT_FOUND'; end if;
  if r.user_id<>uid and not public.has_permission('chat.manage') then raise exception 'FORBIDDEN'; end if;
  insert into public.chat_messages(room_id,sender_id,message) values(r.id,uid,btrim(p_message)) returning * into m;
  return m;
end; $$;
revoke all on function public.send_chat_message(uuid,text) from public,anon;
grant execute on function public.send_chat_message(uuid,text) to authenticated;

-- 7) Banners
create table if not exists public.banners(
  id uuid primary key default gen_random_uuid(), title text not null, image_url text not null, link_url text,
  sort_order int not null default 0, starts_at timestamptz, ends_at timestamptz, is_active boolean not null default true,
  created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists banners_active_order_idx on public.banners(is_active,sort_order);
alter table public.banners enable row level security;
drop policy if exists banners_public on public.banners; drop policy if exists banners_admin on public.banners;
create policy banners_public on public.banners for select using(is_active=true and (starts_at is null or now()>=starts_at) and (ends_at is null or now()<=ends_at));
create policy banners_admin on public.banners for all using(public.has_permission('marketing.manage')) with check(public.has_permission('marketing.manage'));

-- 8) Wallet reserved balance / withdrawals.
alter table public.wallets add column if not exists reserved_balance numeric(14,2) not null default 0 check(reserved_balance>=0);
create table if not exists public.withdrawal_requests(
  id uuid primary key default gen_random_uuid(), withdrawal_code text unique not null, user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(14,2) not null check(amount>0), method text not null, destination text not null,
  status text not null default 'PENDING' check(status in ('PENDING','APPROVED','REJECTED','CANCELLED')),
  rejection_reason text, reviewed_by uuid references public.profiles(id), reviewed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists withdrawals_user_created_idx on public.withdrawal_requests(user_id,created_at desc);
alter table public.withdrawal_requests enable row level security;
drop policy if exists withdrawal_self on public.withdrawal_requests; drop policy if exists withdrawal_admin on public.withdrawal_requests;
create policy withdrawal_self on public.withdrawal_requests for select using(auth.uid()=user_id);
create policy withdrawal_admin on public.withdrawal_requests for select using(public.has_permission('finance.view'));

-- 9) Customer history RLS + status history writes only through trusted code.
drop policy if exists member_deposits_self_update on public.member_deposits;
create policy member_deposits_self_update on public.member_deposits for update to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);

-- 10) Realtime.
do $$ begin alter publication supabase_realtime add table public.notifications; exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.banners; exception when duplicate_object then null; when undefined_object then null; end $$;

-- 11) Grants for public catalog reads.
grant select on public.banners to anon,authenticated;

-- 12) Secure guest tracking token + guest payment proof support.
-- Guest orders can pay manually and submit proof using order code + tracking token.
alter table public.payment_proofs alter column user_id drop not null;

revoke all on function public.create_manual_order(uuid,uuid,jsonb,uuid,text) from public,anon,authenticated;
grant execute on function public.create_manual_order(uuid,uuid,jsonb,uuid,text) to authenticated;

alter table public.orders add column if not exists tracking_token uuid not null default gen_random_uuid();
create unique index if not exists orders_tracking_token_uidx on public.orders(tracking_token);

create or replace function public.create_guest_order(
  p_game_id uuid,p_product_id uuid,p_customer_data jsonb,p_payment_method_id uuid,p_voucher_code text default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare prod public.game_products; game public.games; oid uuid; subtotal numeric; discount numeric:=0; total numeric; v public.vouchers; code text; token uuid;
begin
  select * into prod from public.game_products where id=p_product_id and game_id=p_game_id and is_active=true;
  if prod.id is null then raise exception 'PRODUCT_NOT_FOUND'; end if;
  select * into game from public.games where id=p_game_id and is_active=true;
  if game.id is null then raise exception 'GAME_NOT_FOUND'; end if;
  if not exists(select 1 from public.payment_methods where id=p_payment_method_id and is_active=true) then raise exception 'PAYMENT_METHOD_NOT_FOUND'; end if;
  subtotal:=prod.price;
  if p_voucher_code is not null and btrim(p_voucher_code)<>'' then
    select * into v from public.vouchers where upper(code)=upper(btrim(p_voucher_code)) and is_active=true and (starts_at is null or now()>=starts_at) and (ends_at is null or now()<=ends_at) and subtotal>=min_order limit 1;
    if v.id is null then raise exception 'INVALID_VOUCHER'; end if;
    if v.discount_type='PERCENT' then discount:=round(subtotal*(v.discount_value/100),2); else discount:=v.discount_value; end if;
    if v.max_discount is not null then discount:=least(discount,v.max_discount); end if;
    discount:=least(discount,subtotal);
  end if;
  total:=subtotal-discount;
  code:=public.make_order_code(); token:=gen_random_uuid();
  insert into public.orders(order_code,user_id,game_id,status,subtotal,discount,admin_fee,total,customer_data,voucher_code,tracking_token)
  values(code,null,p_game_id,'PENDING_PAYMENT',subtotal,discount,0,total,coalesce(p_customer_data,'{}'),nullif(btrim(p_voucher_code),''),token) returning id into oid;
  insert into public.order_items(order_id,product_id,product_name,sku,quantity,unit_price) values(oid,prod.id,prod.name,prod.sku,1,prod.price);
  insert into public.payments(order_id,payment_method_id,amount,status) values(oid,p_payment_method_id,total,'PENDING');
  insert into public.order_status_history(order_id,old_status,new_status,changed_by,note) values(oid,null,'PENDING_PAYMENT',null,'Guest order dibuat.');
  return jsonb_build_object('id',oid,'order_code',code,'tracking_token',token);
end; $$;
revoke all on function public.create_guest_order(uuid,uuid,jsonb,uuid,text) from public,anon,authenticated;
grant execute on function public.create_guest_order(uuid,uuid,jsonb,uuid,text) to anon,authenticated;

drop function if exists public.track_order_secure(text,uuid);
create function public.track_order_secure(p_order_code text,p_tracking_token uuid)
returns table(order_code text,status public.order_status,created_at timestamptz,game_name text,total numeric,payment_method_name text,payment_account_name text,payment_account_number text,payment_qr_url text,payment_instruction text)
language sql security definer set search_path=public as $$
  select o.order_code,o.status,o.created_at,g.name,o.total,pm.name,pm.account_name,pm.account_number,pm.qr_url,pm.instruction
  from public.orders o
  join public.games g on g.id=o.game_id
  left join public.payments pay on pay.order_id=o.id
  left join public.payment_methods pm on pm.id=pay.payment_method_id
  where upper(o.order_code)=upper(btrim(p_order_code)) and o.tracking_token=p_tracking_token
  limit 1;
$$;
revoke all on function public.track_order_secure(text,uuid) from public,anon,authenticated;
grant execute on function public.track_order_secure(text,uuid) to anon,authenticated;
revoke all on function public.track_order(text) from public,anon,authenticated;
grant execute on function public.track_order(text) to authenticated;

-- 13) Co-owner participates in the staff/admin security layer.
create or replace function public.is_staff() returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles where id=auth.uid() and role in ('owner','co_owner','admin','customer_service') and is_suspended=false);
$$;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles where id=auth.uid() and role in ('owner','co_owner','admin') and is_suspended=false);
$$;

-- 14) Permission-based wallet adjustment for finance staff.
create or replace function public.adjust_wallet(p_user_id uuid,p_amount numeric,p_reason text)
returns public.wallets language plpgsql security definer set search_path=public as $$
declare actor uuid:=auth.uid(); w public.wallets; before_balance numeric; after_balance numeric; tx_type text; result public.wallets;
begin
  if actor is null or not public.has_permission(case when p_amount>0 then 'finance.wallet.credit' else 'finance.wallet.debit' end) then raise exception 'FORBIDDEN'; end if;
  if p_user_id is null or p_amount is null or p_amount=0 then raise exception 'INVALID_WALLET_ADJUSTMENT'; end if;
  if length(btrim(coalesce(p_reason,'')))<3 then raise exception 'WALLET_REASON_REQUIRED'; end if;
  insert into public.wallets(user_id) values(p_user_id) on conflict(user_id) do nothing;
  select * into w from public.wallets where user_id=p_user_id for update;
  before_balance:=w.balance; after_balance:=before_balance+p_amount;
  if after_balance<0 then raise exception 'INSUFFICIENT_WALLET_BALANCE'; end if;
  update public.wallets set balance=after_balance,updated_at=now() where user_id=p_user_id returning * into result;
  tx_type:=case when p_amount>0 then 'ADMIN_CREDIT' else 'ADMIN_DEBIT' end;
  insert into public.wallet_transactions(user_id,amount,balance_before,balance_after,type,reason,actor_id) values(p_user_id,p_amount,before_balance,after_balance,tx_type,btrim(p_reason),actor);
  insert into public.admin_audit_logs(admin_id,action,entity_type,entity_id,metadata) values(actor,lower(tx_type),'wallet',p_user_id,jsonb_build_object('amount',p_amount,'before',before_balance,'after',after_balance,'reason',btrim(p_reason)));
  return result;
end; $$;
revoke all on function public.adjust_wallet(uuid,numeric,text) from public,anon,authenticated;
grant execute on function public.adjust_wallet(uuid,numeric,text) to authenticated;

-- 15) Permission-aware order processing with explicit refund transition.
create or replace function public.admin_transition_order(p_order_id uuid,p_new_status public.order_status,p_note text default null)
returns void language plpgsql security definer set search_path=public as $$
declare actor uuid:=auth.uid(); old public.order_status; uid uuid;
begin
  if actor is null or not public.has_permission('orders.process') then raise exception 'FORBIDDEN'; end if;
  select status,user_id into old,uid from public.orders where id=p_order_id for update;
  if old is null then raise exception 'ORDER_NOT_FOUND'; end if;
  if old='PENDING_PAYMENT' and p_new_status not in ('PAYMENT_RECEIVED','CANCELLED','EXPIRED') then raise exception 'INVALID_TRANSITION'; end if;
  if old='PAYMENT_RECEIVED' and p_new_status not in ('PROCESSING','FAILED','CANCELLED') then raise exception 'INVALID_TRANSITION'; end if;
  if old='PROCESSING' and p_new_status not in ('SUCCESS','FAILED') then raise exception 'INVALID_TRANSITION'; end if;
  if old in ('FAILED','CANCELLED') and p_new_status<>'REFUNDED' then raise exception 'INVALID_TRANSITION'; end if;
  if p_new_status='REFUNDED' and not public.has_permission('orders.refund') then raise exception 'FORBIDDEN'; end if;
  update public.orders set status=p_new_status,updated_at=now() where id=p_order_id;
  if p_new_status='PAYMENT_RECEIVED' then
    update public.payments set status='PAID',updated_at=now() where order_id=p_order_id;
    update public.payment_proofs set verified=true where id=(select id from public.payment_proofs where order_id=p_order_id order by created_at desc limit 1);
  elsif p_new_status='SUCCESS' then
    update public.payments set status='PAID',updated_at=now() where order_id=p_order_id;
  elsif p_new_status='FAILED' then
    update public.payments set status='FAILED',updated_at=now() where order_id=p_order_id;
  elsif p_new_status='CANCELLED' then
    update public.payments set status='CANCELLED',updated_at=now() where order_id=p_order_id;
  end if;
  insert into public.order_status_history(order_id,old_status,new_status,changed_by,note) values(p_order_id,old,p_new_status,actor,p_note);
  insert into public.admin_audit_logs(admin_id,action,entity_type,entity_id,metadata) values(actor,'CHANGE_ORDER_STATUS','order',p_order_id,jsonb_build_object('from',old,'to',p_new_status,'note',p_note));
  if uid is not null then insert into public.notifications(user_id,title,body,type) values(uid,'Status order berubah','Order kamu sekarang berstatus '||replace(p_new_status::text,'_',' ')||'.','ORDER'); end if;
end; $$;
revoke all on function public.admin_transition_order(uuid,public.order_status,text) from public,anon,authenticated;
grant execute on function public.admin_transition_order(uuid,public.order_status,text) to authenticated;

-- 16) Finance review uses explicit permission rather than role alone.
create or replace function public.review_member_deposit(p_deposit_id uuid,p_action text,p_rejection_reason text default null)
returns public.member_deposits language plpgsql security definer set search_path=public as $$
declare actor uuid:=auth.uid(); d public.member_deposits; w public.wallets; before_balance numeric; after_balance numeric;
begin
  if actor is null or not public.has_permission(case when upper(p_action)='APPROVE' then 'finance.deposit.approve' else 'finance.deposit.reject' end) then raise exception 'FORBIDDEN'; end if;
  if upper(p_action) not in ('APPROVE','REJECT') then raise exception 'INVALID_REVIEW_ACTION'; end if;
  select * into d from public.member_deposits where id=p_deposit_id for update;
  if d.id is null then raise exception 'DEPOSIT_NOT_FOUND'; end if;
  if d.status<>'PENDING' then raise exception 'DEPOSIT_ALREADY_REVIEWED'; end if;
  if upper(p_action)='REJECT' and length(btrim(coalesce(p_rejection_reason,'')))<3 then raise exception 'REJECTION_REASON_REQUIRED'; end if;
  if upper(p_action)='APPROVE' then
    insert into public.wallets(user_id) values(d.user_id) on conflict(user_id) do nothing;
    select * into w from public.wallets where user_id=d.user_id for update;
    before_balance:=w.balance; after_balance:=before_balance+d.amount;
    update public.wallets set balance=after_balance,updated_at=now() where user_id=d.user_id;
    insert into public.wallet_transactions(user_id,amount,balance_before,balance_after,type,reason,actor_id) values(d.user_id,d.amount,before_balance,after_balance,'DEPOSIT','Deposit disetujui: '||d.deposit_code,actor);
    update public.member_deposits set status='APPROVED',reviewed_by=actor,reviewed_at=now(),updated_at=now(),rejection_reason=null where id=d.id returning * into d;
    insert into public.notifications(user_id,title,body,type) values(d.user_id,'Deposit berhasil','Saldo kamu bertambah Rp '||to_char(d.amount,'FM999G999G999G990D00')||'.','WALLET');
  else
    update public.member_deposits set status='REJECTED',reviewed_by=actor,reviewed_at=now(),updated_at=now(),rejection_reason=btrim(p_rejection_reason) where id=d.id returning * into d;
    insert into public.notifications(user_id,title,body,type) values(d.user_id,'Deposit ditolak','Deposit '||d.deposit_code||' ditolak. Alasan: '||btrim(p_rejection_reason),'WALLET');
  end if;
  insert into public.admin_audit_logs(admin_id,action,entity_type,entity_id,metadata) values(actor,case when upper(p_action)='APPROVE' then 'APPROVE_DEPOSIT' else 'REJECT_DEPOSIT' end,'member_deposit',d.id,jsonb_build_object('deposit_code',d.deposit_code,'amount',d.amount,'reason',p_rejection_reason));
  return d;
end; $$;
revoke all on function public.review_member_deposit(uuid,text,text) from public,anon,authenticated;
grant execute on function public.review_member_deposit(uuid,text,text) to authenticated;

-- 17) Permission-aware table policies. UI restrictions are convenience; RLS remains the security boundary.
drop policy if exists profiles_admin on public.profiles;
create policy profiles_admin on public.profiles for all using(public.has_permission('users.manage')) with check(public.has_permission('users.manage'));
drop policy if exists games_admin on public.games;
create policy games_admin on public.games for all using(public.has_permission('catalog.manage')) with check(public.has_permission('catalog.manage'));
drop policy if exists fields_admin on public.game_fields;
create policy fields_admin on public.game_fields for all using(public.has_permission('catalog.manage')) with check(public.has_permission('catalog.manage'));
drop policy if exists products_admin on public.game_products;
create policy products_admin on public.game_products for all using(public.has_permission('catalog.manage')) with check(public.has_permission('catalog.manage'));
drop policy if exists methods_admin on public.payment_methods;
create policy methods_admin on public.payment_methods for all using(public.has_permission('catalog.manage')) with check(public.has_permission('catalog.manage'));
drop policy if exists vouchers_admin on public.vouchers;
create policy vouchers_admin on public.vouchers for all using(public.has_permission('marketing.manage')) with check(public.has_permission('marketing.manage'));
drop policy if exists promotions_admin on public.promotions;
create policy promotions_admin on public.promotions for all using(public.has_permission('marketing.manage')) with check(public.has_permission('marketing.manage'));
drop policy if exists media_admin on public.media_assets;
create policy media_admin on public.media_assets for all using(public.has_permission('catalog.manage')) with check(public.has_permission('catalog.manage'));
drop policy if exists settings_admin on public.settings;
create policy settings_admin on public.settings for all using(public.has_permission('settings.manage')) with check(public.has_permission('settings.manage'));
drop policy if exists broadcasts_admin on public.broadcasts;
create policy broadcasts_admin on public.broadcasts for all using(public.has_permission('broadcast.manage')) with check(public.has_permission('broadcast.manage'));
drop policy if exists admin_audit_logs_admin on public.admin_audit_logs;
create policy admin_audit_logs_admin on public.admin_audit_logs for select using(public.has_permission('audit.view'));
