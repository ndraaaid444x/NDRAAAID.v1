create extension if not exists pgcrypto;

do $$ begin create type public.user_role as enum ('user','owner','admin','customer_service'); exception when duplicate_object then null; end $$;
do $$ begin create type public.order_status as enum ('PENDING_PAYMENT','PAYMENT_RECEIVED','PROCESSING','SUCCESS','FAILED','CANCELLED','EXPIRED'); exception when duplicate_object then null; end $$;

create table if not exists public.profiles(id uuid primary key references auth.users(id) on delete cascade,name text,username text unique,email text,phone text,avatar_url text,role public.user_role not null default 'user',is_suspended boolean not null default false,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.games(id uuid primary key default gen_random_uuid(),slug text unique not null,name text not null,description text,logo_url text,banner_url text,is_active boolean not null default true,popular boolean not null default false,created_at timestamptz not null default now());
create table if not exists public.game_fields(id uuid primary key default gen_random_uuid(),game_id uuid not null references public.games(id) on delete cascade,key text not null,label text not null,placeholder text,required boolean not null default true,sort_order int not null default 0,unique(game_id,key));
create table if not exists public.game_products(id uuid primary key default gen_random_uuid(),game_id uuid not null references public.games(id) on delete cascade,name text not null,nominal text,sku text unique not null,price numeric(14,2) not null check(price>=0),image_url text,is_active boolean not null default true,created_at timestamptz not null default now());
create table if not exists public.payment_methods(id uuid primary key default gen_random_uuid(),name text not null,kind text not null,account_name text,account_number text,instruction text,qr_url text,is_active boolean not null default true,created_at timestamptz not null default now());
create table if not exists public.orders(id uuid primary key default gen_random_uuid(),order_code text unique not null,user_id uuid not null references public.profiles(id),game_id uuid not null references public.games(id),status public.order_status not null default 'PENDING_PAYMENT',subtotal numeric(14,2) not null,discount numeric(14,2) not null default 0,admin_fee numeric(14,2) not null default 0,total numeric(14,2) not null,customer_data jsonb not null default '{}',voucher_code text,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.order_items(id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders(id) on delete cascade,product_id uuid references public.game_products(id),product_name text not null,sku text,quantity int not null default 1,unit_price numeric(14,2) not null);
create table if not exists public.payments(id uuid primary key default gen_random_uuid(),order_id uuid unique not null references public.orders(id) on delete cascade,payment_method_id uuid references public.payment_methods(id),amount numeric(14,2) not null,status text not null default 'PENDING',external_reference text,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.payment_proofs(id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders(id) on delete cascade,user_id uuid not null references public.profiles(id),storage_path text not null,verified boolean not null default false,created_at timestamptz not null default now());
create table if not exists public.order_status_history(id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders(id) on delete cascade,old_status public.order_status,new_status public.order_status,changed_by uuid references public.profiles(id),note text,created_at timestamptz not null default now());
create table if not exists public.notifications(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id) on delete cascade,title text not null,body text not null,type text not null,read_at timestamptz,created_at timestamptz not null default now());
create table if not exists public.vouchers(id uuid primary key default gen_random_uuid(),code text unique not null,discount_type text not null check(discount_type in ('PERCENT','FIXED')),discount_value numeric(14,2) not null,min_order numeric(14,2) not null default 0,max_discount numeric(14,2),starts_at timestamptz,ends_at timestamptz,is_active boolean not null default true);
create table if not exists public.promotions(id uuid primary key default gen_random_uuid(),name text not null,banner_url text,description text,code text,starts_at timestamptz,ends_at timestamptz,is_active boolean not null default true);
create table if not exists public.wishlist(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id) on delete cascade,game_id uuid not null references public.games(id) on delete cascade,unique(user_id,game_id));
create table if not exists public.admin_audit_logs(id uuid primary key default gen_random_uuid(),admin_id uuid references public.profiles(id),action text not null,entity_type text,entity_id uuid,metadata jsonb not null default '{}',created_at timestamptz not null default now());
create table if not exists public.chat_rooms(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id) on delete cascade,status text not null default 'OPEN',created_at timestamptz not null default now());
create table if not exists public.chat_messages(id uuid primary key default gen_random_uuid(),room_id uuid not null references public.chat_rooms(id) on delete cascade,sender_id uuid not null references public.profiles(id),message text not null,read_at timestamptz,created_at timestamptz not null default now());
create unique index if not exists chat_rooms_one_open_per_user_idx on public.chat_rooms(user_id) where status='OPEN';
create table if not exists public.settings(key text primary key,value jsonb not null default '{}',updated_at timestamptz not null default now());
create table if not exists public.broadcasts(id uuid primary key default gen_random_uuid(),title text not null,message text not null,type text not null default 'PROMO' check(type in ('INFO','PROMO','WARNING','SUCCESS')),starts_at timestamptz not null default now(),ends_at timestamptz not null,link_url text,link_label text,is_active boolean not null default true,created_by uuid references public.profiles(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),check(ends_at > starts_at));
create table if not exists public.media_assets(id uuid primary key default gen_random_uuid(),name text not null,path text unique not null,url text not null,category text not null default 'general',mime_type text,size_bytes bigint,alt_text text,created_by uuid references public.profiles(id),created_at timestamptz not null default now());

create or replace function public.is_staff() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.profiles where id=auth.uid() and role in ('owner','admin','customer_service') and is_suspended=false); $$;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.profiles where id=auth.uid() and role in ('owner','admin') and is_suspended=false); $$;
create or replace function public.is_owner() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.profiles where id=auth.uid() and role='owner' and is_suspended=false); $$;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$ begin insert into public.profiles(id,name,username,email,phone) values(new.id,new.raw_user_meta_data->>'name',nullif(new.raw_user_meta_data->>'username',''),new.email,new.raw_user_meta_data->>'phone') on conflict(id) do update set email=excluded.email; return new; end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.make_order_code() returns text language plpgsql as $$ declare code text; begin loop code := 'NDRAAAID-'||to_char(now(),'YYYYMMDD')||'-'||lpad((floor(random()*100000))::int::text,5,'0'); exit when not exists(select 1 from public.orders where order_code=code); end loop; return code; end; $$;

create or replace function public.create_manual_order(p_game_id uuid,p_product_id uuid,p_customer_data jsonb,p_payment_method_id uuid,p_voucher_code text default null) returns uuid language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); prod public.game_products; game public.games; oid uuid; subtotal numeric; discount numeric:=0; fee numeric:=0; total numeric; v public.vouchers;
begin
 if uid is null then raise exception 'UNAUTHORIZED'; end if;
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
 total:=subtotal-discount+fee;
 insert into public.orders(order_code,user_id,game_id,status,subtotal,discount,admin_fee,total,customer_data,voucher_code) values(make_order_code(),uid,p_game_id,'PENDING_PAYMENT',subtotal,discount,fee,total,coalesce(p_customer_data,'{}'),nullif(btrim(p_voucher_code),'')) returning id into oid;
 insert into public.order_items(order_id,product_id,product_name,sku,quantity,unit_price) values(oid,prod.id,prod.name,prod.sku,1,prod.price);
 insert into public.payments(order_id,payment_method_id,amount,status) values(oid,p_payment_method_id,total,'PENDING');
 insert into public.order_status_history(order_id,old_status,new_status,changed_by,note) values(oid,null,'PENDING_PAYMENT',uid,'Order dibuat oleh customer.');
 insert into public.notifications(user_id,title,body,type) values(uid,'Order berhasil dibuat','Order kamu sudah dibuat. Silakan lakukan pembayaran manual dan upload bukti.','ORDER');
 return oid;
end; $$;

create or replace function public.admin_transition_order(p_order_id uuid,p_new_status public.order_status,p_note text default null) returns void language plpgsql security definer set search_path=public as $$ declare actor uuid:=auth.uid(); old public.order_status; uid uuid; begin if not public.is_admin() then raise exception 'FORBIDDEN'; end if; select status,user_id into old,uid from public.orders where id=p_order_id for update; if old is null then raise exception 'ORDER_NOT_FOUND'; end if; if old='PENDING_PAYMENT' and p_new_status not in ('PAYMENT_RECEIVED','CANCELLED','EXPIRED') then raise exception 'INVALID_TRANSITION'; end if; if old='PAYMENT_RECEIVED' and p_new_status not in ('PROCESSING','FAILED','CANCELLED') then raise exception 'INVALID_TRANSITION'; end if; if old='PROCESSING' and p_new_status not in ('SUCCESS','FAILED') then raise exception 'INVALID_TRANSITION'; end if; update public.orders set status=p_new_status,updated_at=now() where id=p_order_id; if p_new_status='PAYMENT_RECEIVED' then update payments set status='PAID',updated_at=now() where order_id=p_order_id; update payment_proofs set verified=true where id=(select id from payment_proofs where order_id=p_order_id order by created_at desc limit 1); end if; insert into public.order_status_history(order_id,old_status,new_status,changed_by,note) values(p_order_id,old,p_new_status,actor,p_note); insert into public.admin_audit_logs(admin_id,action,entity_type,entity_id,metadata) values(actor,'CHANGE_ORDER_STATUS','order',p_order_id,jsonb_build_object('from',old,'to',p_new_status,'note',p_note)); insert into public.notifications(user_id,title,body,type) values(uid,'Status order berubah','Order kamu sekarang berstatus '||replace(p_new_status::text,'_',' ')||'.','ORDER'); end; $$;

drop view if exists public.orders_public;
create or replace function public.track_order(p_order_code text) returns table(order_code text,status public.order_status,created_at timestamptz,game_name text) language sql security definer set search_path=public as $$ select o.order_code,o.status,o.created_at,g.name from public.orders o join public.games g on g.id=o.game_id where upper(o.order_code)=upper(btrim(p_order_code)) limit 1; $$;
revoke all on function public.track_order(text) from public; grant execute on function public.track_order(text) to anon,authenticated;

alter table public.profiles enable row level security; alter table public.games enable row level security; alter table public.game_fields enable row level security; alter table public.game_products enable row level security; alter table public.payment_methods enable row level security; alter table public.orders enable row level security; alter table public.order_items enable row level security; alter table public.payments enable row level security; alter table public.payment_proofs enable row level security; alter table public.order_status_history enable row level security; alter table public.notifications enable row level security; alter table public.vouchers enable row level security; alter table public.promotions enable row level security; alter table public.wishlist enable row level security; alter table public.admin_audit_logs enable row level security; alter table public.chat_rooms enable row level security; alter table public.chat_messages enable row level security; alter table public.broadcasts enable row level security; alter table public.media_assets enable row level security;

create policy "public can read active broadcasts" on public.broadcasts for select using (is_active=true and starts_at<=now() and ends_at>now());
create policy "staff can read broadcasts" on public.broadcasts for select using (is_admin());
create policy "admins can insert broadcasts" on public.broadcasts for insert with check (is_admin() and created_by=auth.uid());
create policy "admins can update broadcasts" on public.broadcasts for update using (is_admin()) with check (is_admin());
create policy "admins can delete broadcasts" on public.broadcasts for delete using (is_admin());

create or replace function public.create_broadcast(
  p_title text,
  p_message text,
  p_type text default 'PROMO',
  p_duration_minutes integer default 60,
  p_link_url text default null,
  p_link_label text default null
) returns public.broadcasts
language plpgsql
security definer
set search_path=public
as $$
declare
  actor uuid := auth.uid();
  result public.broadcasts;
  mins integer := greatest(1, least(coalesce(p_duration_minutes,60), 10080));
  started timestamptz := now();
begin
  if actor is null or not public.is_admin() then
    raise exception 'FORBIDDEN';
  end if;
  if nullif(btrim(p_title),'') is null then raise exception 'BROADCAST_TITLE_REQUIRED'; end if;
  if nullif(btrim(p_message),'') is null then raise exception 'BROADCAST_MESSAGE_REQUIRED'; end if;
  if upper(coalesce(p_type,'PROMO')) not in ('INFO','PROMO','WARNING','SUCCESS') then raise exception 'INVALID_BROADCAST_TYPE'; end if;

  insert into public.broadcasts(title,message,type,starts_at,ends_at,link_url,link_label,is_active,created_by)
  values(
    btrim(p_title), btrim(p_message), upper(coalesce(p_type,'PROMO')),
    started, started + make_interval(mins => mins),
    nullif(btrim(p_link_url),''), nullif(btrim(p_link_label),''), true, actor
  )
  returning * into result;
  return result;
end;
$$;

revoke execute on function public.create_broadcast(text,text,text,integer,text,text) from public,anon,authenticated;
grant execute on function public.create_broadcast(text,text,text,integer,text,text) to authenticated;


alter table public.settings enable row level security;

-- Policies are recreated so this script can be safely re-run during development.
do $$ declare r record; begin for r in select schemaname,tablename,policyname from pg_policies where schemaname='public' and tablename in ('profiles','games','game_fields','game_products','payment_methods','orders','order_items','payments','payment_proofs','order_status_history','notifications','vouchers','promotions','wishlist','admin_audit_logs','chat_rooms','chat_messages','broadcasts','media_assets','settings') loop execute format('drop policy if exists %I on %I.%I',r.policyname,r.schemaname,r.tablename); end loop; end $$;
create policy profiles_self on public.profiles for select using(auth.uid()=id or public.is_staff()); create policy profiles_update_self on public.profiles for update using(auth.uid()=id); create policy profiles_admin on public.profiles for all using(public.is_admin()) with check(public.is_admin());
create policy games_public on public.games for select using(is_active=true or public.is_admin()); create policy games_admin on public.games for all using(public.is_admin()) with check(public.is_admin());
create policy fields_public on public.game_fields for select using(exists(select 1 from games g where g.id=game_id and g.is_active=true) or public.is_admin()); create policy fields_admin on public.game_fields for all using(public.is_admin()) with check(public.is_admin());
create policy products_public on public.game_products for select using(is_active=true or public.is_admin()); create policy products_admin on public.game_products for all using(public.is_admin()) with check(public.is_admin());
create policy methods_public on public.payment_methods for select using(is_active=true or public.is_admin()); create policy methods_admin on public.payment_methods for all using(public.is_admin()) with check(public.is_admin());
create policy vouchers_admin_write on public.vouchers for insert with check(public.is_admin());
create policy promotions_admin_write on public.promotions for insert with check(public.is_admin());
create policy orders_self on public.orders for select using(auth.uid()=user_id or public.is_staff());
create policy items_self on public.order_items for select using(exists(select 1 from orders o where o.id=order_id and (o.user_id=auth.uid() or public.is_staff())));
create policy payments_self on public.payments for select using(exists(select 1 from orders o where o.id=order_id and (o.user_id=auth.uid() or public.is_staff())));
create policy proofs_self_insert on public.payment_proofs for insert with check(auth.uid()=user_id and exists(select 1 from orders o where o.id=order_id and o.user_id=auth.uid())); create policy proofs_self_read on public.payment_proofs for select using(auth.uid()=user_id or public.is_admin());
create policy history_self on public.order_status_history for select using(exists(select 1 from orders o where o.id=order_id and (o.user_id=auth.uid() or public.is_admin())));
create policy notifications_self on public.notifications for select using(auth.uid()=user_id); create policy notifications_update on public.notifications for update using(auth.uid()=user_id);
create policy vouchers_public on public.vouchers for select using(is_active=true); create policy vouchers_admin on public.vouchers for all using(public.is_admin()) with check(public.is_admin());
create policy promotions_public on public.promotions for select using(is_active=true); create policy promotions_admin on public.promotions for all using(public.is_admin()) with check(public.is_admin());
create policy wishlist_self on public.wishlist for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy audit_admin on public.admin_audit_logs for select using(public.is_admin());
create policy chat_rooms_self on public.chat_rooms for select using(auth.uid()=user_id or public.is_staff()); create policy chat_rooms_insert on public.chat_rooms for insert with check(auth.uid()=user_id); create policy chat_rooms_staff_update on public.chat_rooms for update using(public.is_staff());
create policy chat_messages_room on public.chat_messages for select using(exists(select 1 from chat_rooms r where r.id=room_id and (r.user_id=auth.uid() or public.is_staff()))); create policy chat_messages_insert on public.chat_messages for insert with check(auth.uid()=sender_id and exists(select 1 from chat_rooms r where r.id=room_id and (r.user_id=auth.uid() or public.is_staff()))); create policy chat_messages_update_staff on public.chat_messages for update using(public.is_staff());
create policy settings_public on public.settings for select using(key in ('site','social','support')); create policy settings_admin on public.settings for all using(public.is_admin()) with check(public.is_admin());
create policy media_public on public.media_assets for select using(true); create policy media_admin on public.media_assets for all using(public.is_admin()) with check(public.is_admin());

insert into storage.buckets(id,name,public) values('payment-proofs','payment-proofs',false),('payment-assets','payment-assets',false),('website-assets','website-assets',true) on conflict(id) do update set public=excluded.public;
drop policy if exists proof_upload_own on storage.objects; drop policy if exists proof_read_owner_admin on storage.objects;
create policy proof_upload_own on storage.objects for insert to authenticated with check(bucket_id='payment-proofs' and (storage.foldername(name))[1]=auth.uid()::text);
create policy proof_read_owner_admin on storage.objects for select to authenticated using(bucket_id='payment-proofs' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin()));
drop policy if exists payment_asset_admin_insert on storage.objects; drop policy if exists payment_asset_admin_read on storage.objects;
create policy payment_asset_admin_insert on storage.objects for insert to authenticated with check(bucket_id='payment-assets' and public.is_admin());
create policy payment_asset_admin_read on storage.objects for select to authenticated using(bucket_id='payment-assets' and public.is_admin());
drop policy if exists website_assets_admin_insert on storage.objects; drop policy if exists website_assets_admin_update on storage.objects; drop policy if exists website_assets_admin_delete on storage.objects;
create policy website_assets_admin_insert on storage.objects for insert to authenticated with check(bucket_id='website-assets' and public.is_admin());
create policy website_assets_admin_update on storage.objects for update to authenticated using(bucket_id='website-assets' and public.is_admin()) with check(bucket_id='website-assets' and public.is_admin());
create policy website_assets_admin_delete on storage.objects for delete to authenticated using(bucket_id='website-assets' and public.is_admin());

insert into public.settings(key,value) values('site','{"name":"NDRAAAID.v1","tagline":"Top Up Game Cepat, Aman & Terpercaya","manual_mode":true}'::jsonb) on conflict(key) do nothing;
insert into public.settings(key,value) values('social','{"whatsapp":"","instagram":"","tiktok":"","facebook":"","discord":""}'::jsonb) on conflict(key) do nothing;
insert into public.settings(key,value) values('support','{"live_chat":true}'::jsonb) on conflict(key) do nothing;
insert into public.payment_methods(name,kind,account_name,account_number,instruction,is_active) values('QRIS Manual','QRIS','NDRAAAID.v1','','Silakan transfer sesuai total order. Upload bukti setelah pembayaran.',true) on conflict do nothing;

insert into games(slug,name,description,popular) values ('mobile-legends','Mobile Legends','Diamonds Mobile Legends',true),('free-fire','Free Fire','Diamond Free Fire',true),('pubg-mobile','PUBG Mobile','UC PUBG Mobile',true),('valorant','Valorant','VP Valorant',true),('genshin-impact','Genshin Impact','Genesis Crystal',true),('honor-of-kings','Honor of Kings','Tokens HOK',true),('roblox','Roblox','Robux Roblox',false),('call-of-duty-mobile','Call of Duty Mobile','CP CODM',false),('ea-fc-mobile','EA FC Mobile','FC Points',false) on conflict(slug) do nothing;
insert into game_fields(game_id,key,label,placeholder,required,sort_order) select id,'user_id','User ID','Masukkan User ID',true,1 from games where slug in('mobile-legends','free-fire','pubg-mobile','genshin-impact','honor-of-kings','roblox','call-of-duty-mobile','ea-fc-mobile') on conflict(game_id,key) do nothing;
insert into game_fields(game_id,key,label,placeholder,required,sort_order) select id,'server','Server ID','Masukkan Server ID',true,2 from games where slug='mobile-legends' on conflict(game_id,key) do nothing;
insert into game_fields(game_id,key,label,placeholder,required,sort_order) select id,'riot_id','Riot ID','Nama#Tag',true,1 from games where slug='valorant' on conflict(game_id,key) do nothing;
insert into game_products(game_id,name,nominal,sku,price) select id,'86 Diamonds','86','ML86',20000 from games where slug='mobile-legends' on conflict(sku) do nothing;
insert into game_products(game_id,name,nominal,sku,price) select id,'172 Diamonds','172','ML172',40000 from games where slug='mobile-legends' on conflict(sku) do nothing;
insert into game_products(game_id,name,nominal,sku,price) select id,'257 Diamonds','257','ML257',60000 from games where slug='mobile-legends' on conflict(sku) do nothing;
insert into game_products(game_id,name,nominal,sku,price) select id,'100 Diamonds','100','FF100',15000 from games where slug='free-fire' on conflict(sku) do nothing;
insert into game_products(game_id,name,nominal,sku,price) select id,'310 Diamonds','310','FF310',45000 from games where slug='free-fire' on conflict(sku) do nothing;
insert into game_products(game_id,name,nominal,sku,price) select id,'60 UC','60','PUBG60',15000 from games where slug='pubg-mobile' on conflict(sku) do nothing;
insert into game_products(game_id,name,nominal,sku,price) select id,'325 UC','325','PUBG325',75000 from games where slug='pubg-mobile' on conflict(sku) do nothing;

create or replace function public.protect_role_change() returns trigger language plpgsql security definer set search_path=public as $$ begin if new.role is distinct from old.role and not public.is_owner() then raise exception 'ONLY_OWNER_CAN_CHANGE_ROLE'; end if; return new; end; $$;
drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role before update on public.profiles for each row execute procedure public.protect_role_change();

-- Enable Supabase Realtime for customer/admin chat and notifications when the project supports publication management.
do $$ begin
  alter publication supabase_realtime add table public.chat_messages;
exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null; when undefined_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.broadcasts;
exception when duplicate_object then null; when undefined_object then null; end $$;

-- Media Manager compatibility for existing databases
alter table public.game_products add column if not exists image_url text;

-- =========================
-- NDRAAAID v2 Admin Management
-- =========================
create table if not exists public.game_categories (
  id uuid primary key default gen_random_uuid(), name text not null unique, slug text not null unique,
  description text, icon_url text, sort_order int not null default 0, is_active boolean not null default true, show_on_home boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.games add column if not exists category_id uuid references public.game_categories(id) on delete set null;
create table if not exists public.wallets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  balance numeric(14,2) not null default 0 check(balance >= 0), updated_at timestamptz not null default now()
);
create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(14,2) not null check(amount <> 0), balance_before numeric(14,2) not null, balance_after numeric(14,2) not null check(balance_after >= 0),
  type text not null check(type in ('ADMIN_CREDIT','ADMIN_DEBIT','ORDER_PAYMENT','REFUND','ADJUSTMENT','DEPOSIT')),
  reason text not null, order_id uuid references public.orders(id) on delete set null, actor_id uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now()
);
create index if not exists wallet_transactions_user_created_idx on public.wallet_transactions(user_id, created_at desc);
insert into public.game_categories(name,slug,description,sort_order) values
('Mobile Games','mobile-games','Game mobile dan top up in-game.',1),('PC Games','pc-games','Game PC dan item digital.',2),('Console','console','Game dan voucher console.',3),('Voucher Digital','voucher-digital','Voucher dan saldo digital.',4) on conflict (slug) do nothing;
update public.games g set category_id=c.id from public.game_categories c where g.category_id is null and c.slug=case when g.slug in ('mobile-legends','free-fire','pubg-mobile','genshin-impact','honor-of-kings','roblox','call-of-duty-mobile','ea-fc-mobile') then 'mobile-games' when g.slug='valorant' then 'pc-games' else 'mobile-games' end;
insert into public.wallets(user_id) select id from public.profiles on conflict(user_id) do nothing;
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$ begin insert into public.profiles(id,name,username,email,phone) values(new.id,new.raw_user_meta_data->>'name',nullif(new.raw_user_meta_data->>'username',''),new.email,new.raw_user_meta_data->>'phone') on conflict(id) do update set email=excluded.email; insert into public.wallets(user_id) values(new.id) on conflict(user_id) do nothing; return new; end; $$;
drop trigger if exists on_auth_user_created on auth.users; create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
create or replace function public.owner_adjust_wallet(p_user_id uuid,p_amount numeric,p_reason text) returns public.wallets language plpgsql security definer set search_path='' as $$ declare actor uuid:=auth.uid(); w public.wallets; before_balance numeric; after_balance numeric; tx_type text; begin if actor is null or not exists(select 1 from public.profiles where id=actor and role='owner' and is_suspended=false) then raise exception 'ONLY_OWNER_CAN_ADJUST_WALLET'; end if; if p_user_id is null or p_amount is null or p_amount=0 then raise exception 'INVALID_WALLET_ADJUSTMENT'; end if; if p_reason is null or length(btrim(p_reason))<3 then raise exception 'WALLET_REASON_REQUIRED'; end if; if not exists(select 1 from public.profiles where id=p_user_id) then raise exception 'USER_NOT_FOUND'; end if; insert into public.wallets(user_id) values(p_user_id) on conflict(user_id) do nothing; select * into w from public.wallets where user_id=p_user_id for update; before_balance:=w.balance; after_balance:=before_balance+p_amount; if after_balance<0 then raise exception 'INSUFFICIENT_WALLET_BALANCE'; end if; update public.wallets set balance=after_balance,updated_at=now() where user_id=p_user_id returning * into w; tx_type:=case when p_amount>0 then 'ADMIN_CREDIT' else 'ADMIN_DEBIT' end; insert into public.wallet_transactions(user_id,amount,balance_before,balance_after,type,reason,actor_id) values(p_user_id,p_amount,before_balance,after_balance,tx_type,btrim(p_reason),actor); insert into public.admin_audit_logs(admin_id,action,entity_type,entity_id,metadata) values(actor,case when p_amount>0 then 'wallet_credit' else 'wallet_debit' end,'wallet',p_user_id,jsonb_build_object('amount',p_amount,'before',before_balance,'after',after_balance,'reason',btrim(p_reason))); return w; end; $$;
create or replace function public.owner_set_suspended(p_user_id uuid,p_suspended boolean) returns public.profiles language plpgsql security definer set search_path='' as $$ declare actor uuid:=auth.uid(); result public.profiles; begin if actor is null or not exists(select 1 from public.profiles where id=actor and role='owner' and is_suspended=false) then raise exception 'ONLY_OWNER_CAN_SUSPEND'; end if; if p_user_id=actor then raise exception 'CANNOT_SUSPEND_SELF'; end if; if not exists(select 1 from public.profiles where id=p_user_id) then raise exception 'USER_NOT_FOUND'; end if; update public.profiles set is_suspended=p_suspended,updated_at=now() where id=p_user_id returning * into result; insert into public.admin_audit_logs(admin_id,action,entity_type,entity_id,metadata) values(actor,case when p_suspended then 'user_suspend' else 'user_activate' end,'profile',p_user_id,jsonb_build_object('suspended',p_suspended)); return result; end; $$;
alter table public.game_categories enable row level security; alter table public.wallets enable row level security; alter table public.wallet_transactions enable row level security;
drop policy if exists game_categories_public on public.game_categories; drop policy if exists game_categories_admin on public.game_categories; create policy game_categories_public on public.game_categories for select using(is_active=true or public.is_admin()); create policy game_categories_admin on public.game_categories for all using(public.is_admin()) with check(public.is_admin());
drop policy if exists wallets_self on public.wallets; drop policy if exists wallets_owner on public.wallets; create policy wallets_self on public.wallets for select using(auth.uid()=user_id); create policy wallets_owner on public.wallets for select using(public.is_owner());
drop policy if exists wallet_tx_self on public.wallet_transactions; drop policy if exists wallet_tx_owner on public.wallet_transactions; create policy wallet_tx_self on public.wallet_transactions for select using(auth.uid()=user_id); create policy wallet_tx_owner on public.wallet_transactions for select using(public.is_owner());
revoke all on public.wallets from anon,authenticated; grant select on public.wallets to authenticated; revoke all on public.wallet_transactions from anon,authenticated; grant select on public.wallet_transactions to authenticated; revoke all on public.game_categories from anon,authenticated; grant select on public.game_categories to anon,authenticated; grant insert,update,delete on public.game_categories to authenticated; revoke execute on function public.owner_adjust_wallet(uuid,numeric,text) from public,anon,authenticated; grant execute on function public.owner_adjust_wallet(uuid,numeric,text) to authenticated; revoke execute on function public.owner_set_suspended(uuid,boolean) from public,anon,authenticated; grant execute on function public.owner_set_suspended(uuid,boolean) to authenticated;
-- NDRAAAID v3 - Member Deposit Management
create table if not exists public.member_deposits (
  id uuid primary key default gen_random_uuid(),
  deposit_code text unique not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  payment_method_id uuid not null references public.payment_methods(id),
  amount numeric(14,2) not null check(amount > 0),
  status text not null default 'PENDING' check(status in ('PENDING','APPROVED','REJECTED','CANCELLED')),
  proof_path text,
  proof_url text,
  note text,
  rejection_reason text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists member_deposits_user_created_idx on public.member_deposits(user_id,created_at desc);
create index if not exists member_deposits_status_created_idx on public.member_deposits(status,created_at desc);

create or replace function public.make_deposit_code() returns text language plpgsql as $$
declare code text;
begin
 loop
   code := 'DEP-'||to_char(now(),'YYYYMMDD')||'-'||lpad((floor(random()*100000))::int::text,5,'0');
   exit when not exists(select 1 from public.member_deposits where deposit_code=code);
 end loop;
 return code;
end; $$;

create or replace function public.create_member_deposit(p_payment_method_id uuid,p_amount numeric,p_proof_path text default null,p_proof_url text default null,p_note text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); did uuid;
begin
 if uid is null then raise exception 'UNAUTHORIZED'; end if;
 if p_amount is null or p_amount <= 0 then raise exception 'INVALID_DEPOSIT_AMOUNT'; end if;
 if not exists(select 1 from public.profiles where id=uid and is_suspended=false) then raise exception 'ACCOUNT_NOT_ALLOWED'; end if;
 if not exists(select 1 from public.payment_methods where id=p_payment_method_id and is_active=true) then raise exception 'PAYMENT_METHOD_NOT_FOUND'; end if;
 insert into public.member_deposits(deposit_code,user_id,payment_method_id,amount,proof_path,proof_url,note)
 values(public.make_deposit_code(),uid,p_payment_method_id,p_amount,nullif(btrim(p_proof_path),''),nullif(btrim(p_proof_url),''),nullif(btrim(p_note),'')) returning id into did;
 insert into public.notifications(user_id,title,body,type) values(uid,'Deposit diterima','Permintaan deposit kamu sedang menunggu verifikasi admin.','WALLET');
 return did;
end; $$;

create or replace function public.review_member_deposit(p_deposit_id uuid,p_action text,p_rejection_reason text default null)
returns public.member_deposits language plpgsql security definer set search_path=public as $$
declare actor uuid:=auth.uid(); d public.member_deposits; w public.wallets; before_balance numeric; after_balance numeric;
begin
 if actor is null or not public.is_admin() then raise exception 'FORBIDDEN'; end if;
 if upper(p_action) not in ('APPROVE','REJECT') then raise exception 'INVALID_REVIEW_ACTION'; end if;
 select * into d from public.member_deposits where id=p_deposit_id for update;
 if d.id is null then raise exception 'DEPOSIT_NOT_FOUND'; end if;
 if d.status <> 'PENDING' then raise exception 'DEPOSIT_ALREADY_REVIEWED'; end if;
 if upper(p_action)='REJECT' and length(btrim(coalesce(p_rejection_reason,''))) < 3 then raise exception 'REJECTION_REASON_REQUIRED'; end if;
 if upper(p_action)='APPROVE' then
   insert into public.wallets(user_id) values(d.user_id) on conflict(user_id) do nothing;
   select * into w from public.wallets where user_id=d.user_id for update;
   before_balance:=w.balance; after_balance:=before_balance+d.amount;
   update public.wallets set balance=after_balance,updated_at=now() where user_id=d.user_id;
   insert into public.wallet_transactions(user_id,amount,balance_before,balance_after,type,reason,actor_id)
   values(d.user_id,d.amount,before_balance,after_balance,'DEPOSIT','Deposit disetujui: '||d.deposit_code,actor);
   update public.member_deposits set status='APPROVED',reviewed_by=actor,reviewed_at=now(),updated_at=now(),rejection_reason=null where id=d.id returning * into d;
   insert into public.notifications(user_id,title,body,type) values(d.user_id,'Deposit berhasil','Saldo kamu bertambah Rp '||to_char(d.amount,'FM999G999G999G990D00')||'.','WALLET');
   insert into public.admin_audit_logs(admin_id,action,entity_type,entity_id,metadata) values(actor,'APPROVE_DEPOSIT','member_deposit',d.id,jsonb_build_object('amount',d.amount,'before',before_balance,'after',after_balance,'deposit_code',d.deposit_code));
 else
   update public.member_deposits set status='REJECTED',reviewed_by=actor,reviewed_at=now(),updated_at=now(),rejection_reason=btrim(p_rejection_reason) where id=d.id returning * into d;
   insert into public.notifications(user_id,title,body,type) values(d.user_id,'Deposit ditolak','Deposit '||d.deposit_code||' ditolak. Alasan: '||btrim(p_rejection_reason),'WALLET');
   insert into public.admin_audit_logs(admin_id,action,entity_type,entity_id,metadata) values(actor,'REJECT_DEPOSIT','member_deposit',d.id,jsonb_build_object('reason',btrim(p_rejection_reason),'deposit_code',d.deposit_code));
 end if;
 return d;
end; $$;

alter table public.member_deposits enable row level security;
revoke all on public.member_deposits from anon,authenticated;
grant select,insert on public.member_deposits to authenticated;

drop policy if exists member_deposits_self_select on public.member_deposits;
drop policy if exists member_deposits_admin_select on public.member_deposits;
create policy member_deposits_self_select on public.member_deposits for select to authenticated using(auth.uid()=user_id);
create policy member_deposits_admin_select on public.member_deposits for select to authenticated using(public.is_admin());

revoke execute on function public.create_member_deposit(uuid,numeric,text,text,text) from public,anon;
grant execute on function public.create_member_deposit(uuid,numeric,text,text,text) to authenticated;
revoke execute on function public.review_member_deposit(uuid,text,text) from public,anon,authenticated;
grant execute on function public.review_member_deposit(uuid,text,text) to authenticated;

-- Allow admin to read wallet balances and wallet ledger; mutations remain function-only.
drop policy if exists wallets_admin on public.wallets;
create policy wallets_admin on public.wallets for select to authenticated using(public.is_admin());
drop policy if exists wallet_tx_admin on public.wallet_transactions;
create policy wallet_tx_admin on public.wallet_transactions for select to authenticated using(public.is_admin());
