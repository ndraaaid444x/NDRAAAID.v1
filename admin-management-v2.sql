-- NDRAAAID v2 Admin Management Upgrade
-- Run once on an existing database. Fresh installs already include this in schema.sql.

create table if not exists public.game_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  icon_url text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  show_on_home boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.games add column if not exists category_id uuid references public.game_categories(id) on delete set null;

create table if not exists public.wallets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  balance numeric(14,2) not null default 0 check(balance >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(14,2) not null check(amount <> 0),
  balance_before numeric(14,2) not null,
  balance_after numeric(14,2) not null check(balance_after >= 0),
  type text not null check(type in ('ADMIN_CREDIT','ADMIN_DEBIT','ORDER_PAYMENT','REFUND','ADJUSTMENT')),
  reason text not null,
  order_id uuid references public.orders(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists wallet_transactions_user_created_idx on public.wallet_transactions(user_id, created_at desc);

insert into public.game_categories(name,slug,description,sort_order)
values
 ('Mobile Games','mobile-games','Game mobile dan top up in-game.',1),
 ('PC Games','pc-games','Game PC dan item digital.',2),
 ('Console','console','Game dan voucher console.',3),
 ('Voucher Digital','voucher-digital','Voucher dan saldo digital.',4)
on conflict (slug) do nothing;

update public.games g
set category_id = c.id
from public.game_categories c
where g.category_id is null
  and c.slug = case
    when g.slug in ('mobile-legends','free-fire','pubg-mobile','genshin-impact','honor-of-kings','roblox','call-of-duty-mobile','ea-fc-mobile') then 'mobile-games'
    when g.slug = 'valorant' then 'pc-games'
    else 'mobile-games'
  end;

insert into public.wallets(user_id)
select id from public.profiles
on conflict (user_id) do nothing;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path=public
as $$
begin
  insert into public.profiles(id,name,username,email,phone)
  values(new.id,new.raw_user_meta_data->>'name',nullif(new.raw_user_meta_data->>'username',''),new.email,new.raw_user_meta_data->>'phone')
  on conflict(id) do update set email=excluded.email;
  insert into public.wallets(user_id) values(new.id) on conflict(user_id) do nothing;
  return new;
end;
$$;

create or replace function public.owner_adjust_wallet(
  p_user_id uuid,
  p_amount numeric,
  p_reason text
) returns public.wallets
language plpgsql security definer set search_path=''
as $$
declare
  actor uuid := auth.uid();
  w public.wallets;
  before_balance numeric;
  after_balance numeric;
  tx_type text;
begin
  if actor is null or not exists(select 1 from public.profiles where id=actor and role='owner' and is_suspended=false) then
    raise exception 'ONLY_OWNER_CAN_ADJUST_WALLET';
  end if;
  if p_user_id is null or p_amount is null or p_amount = 0 then raise exception 'INVALID_WALLET_ADJUSTMENT'; end if;
  if p_reason is null or length(btrim(p_reason)) < 3 then raise exception 'WALLET_REASON_REQUIRED'; end if;
  if not exists(select 1 from public.profiles where id=p_user_id) then raise exception 'USER_NOT_FOUND'; end if;
  insert into public.wallets(user_id) values(p_user_id) on conflict(user_id) do nothing;
  select * into w from public.wallets where user_id=p_user_id for update;
  before_balance := w.balance;
  after_balance := before_balance + p_amount;
  if after_balance < 0 then raise exception 'INSUFFICIENT_WALLET_BALANCE'; end if;
  update public.wallets set balance=after_balance, updated_at=now() where user_id=p_user_id returning * into w;
  tx_type := case when p_amount > 0 then 'ADMIN_CREDIT' else 'ADMIN_DEBIT' end;
  insert into public.wallet_transactions(user_id,amount,balance_before,balance_after,type,reason,actor_id)
  values(p_user_id,p_amount,before_balance,after_balance,tx_type,btrim(p_reason),actor);
  insert into public.admin_audit_logs(admin_id,action,entity_type,entity_id,metadata)
  values(actor,case when p_amount > 0 then 'wallet_credit' else 'wallet_debit' end,'wallet',p_user_id,jsonb_build_object('amount',p_amount,'before',before_balance,'after',after_balance,'reason',btrim(p_reason)));
  return w;
end;
$$;

create or replace function public.owner_set_suspended(p_user_id uuid, p_suspended boolean)
returns public.profiles
language plpgsql security definer set search_path=''
as $$
declare actor uuid := auth.uid(); result public.profiles;
begin
  if actor is null or not exists(select 1 from public.profiles where id=actor and role='owner' and is_suspended=false) then raise exception 'ONLY_OWNER_CAN_SUSPEND'; end if;
  if p_user_id = actor then raise exception 'CANNOT_SUSPEND_SELF'; end if;
  if not exists(select 1 from public.profiles where id=p_user_id) then raise exception 'USER_NOT_FOUND'; end if;
  update public.profiles set is_suspended=p_suspended, updated_at=now() where id=p_user_id returning * into result;
  insert into public.admin_audit_logs(admin_id,action,entity_type,entity_id,metadata)
  values(actor,case when p_suspended then 'user_suspend' else 'user_activate' end,'profile',p_user_id,jsonb_build_object('suspended',p_suspended));
  return result;
end;
$$;

alter table public.game_categories enable row level security;
alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;

drop policy if exists game_categories_public on public.game_categories;
drop policy if exists game_categories_admin on public.game_categories;
create policy game_categories_public on public.game_categories for select using(is_active=true or public.is_admin());
create policy game_categories_admin on public.game_categories for all using(public.is_admin()) with check(public.is_admin());

drop policy if exists wallets_self on public.wallets;
drop policy if exists wallets_owner on public.wallets;
create policy wallets_self on public.wallets for select using(auth.uid()=user_id);
create policy wallets_owner on public.wallets for select using(public.is_owner());

drop policy if exists wallet_tx_self on public.wallet_transactions;
drop policy if exists wallet_tx_owner on public.wallet_transactions;
create policy wallet_tx_self on public.wallet_transactions for select using(auth.uid()=user_id);
create policy wallet_tx_owner on public.wallet_transactions for select using(public.is_owner());

revoke all on public.wallets from anon, authenticated;
grant select on public.wallets to authenticated;
revoke all on public.wallet_transactions from anon, authenticated;
grant select on public.wallet_transactions to authenticated;
revoke all on public.game_categories from anon, authenticated;
grant select on public.game_categories to anon, authenticated;
grant insert,update,delete on public.game_categories to authenticated;
revoke execute on function public.owner_adjust_wallet(uuid,numeric,text) from public,anon,authenticated;
grant execute on function public.owner_adjust_wallet(uuid,numeric,text) to authenticated;
revoke execute on function public.owner_set_suspended(uuid,boolean) from public,anon,authenticated;
grant execute on function public.owner_set_suspended(uuid,boolean) to authenticated;

insert into public.wallets(user_id) select id from public.profiles on conflict do nothing;
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
