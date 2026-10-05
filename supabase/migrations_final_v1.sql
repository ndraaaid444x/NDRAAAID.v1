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

create or replace function public.create_guest_order(
  p_game_id uuid,
  p_product_id uuid,
  p_customer_data jsonb,
  p_payment_method_id uuid,
  p_voucher_code text default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare prod public.game_products; game public.games; oid uuid; subtotal numeric; discount numeric:=0; total numeric; v public.vouchers;
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
  insert into public.orders(order_code,user_id,game_id,status,subtotal,discount,admin_fee,total,customer_data,voucher_code)
  values(public.make_order_code(),null,p_game_id,'PENDING_PAYMENT',subtotal,discount,0,total,coalesce(p_customer_data,'{}'),nullif(btrim(p_voucher_code),'')) returning id into oid;
  insert into public.order_items(order_id,product_id,product_name,sku,quantity,unit_price) values(oid,prod.id,prod.name,prod.sku,1,prod.price);
  insert into public.payments(order_id,payment_method_id,amount,status) values(oid,p_payment_method_id,total,'PENDING');
  return oid;
end; $$;
revoke all on function public.create_guest_order(uuid,uuid,jsonb,uuid,text) from public,anon,authenticated;
grant execute on function public.create_guest_order(uuid,uuid,jsonb,uuid,text) to anon,authenticated;

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
