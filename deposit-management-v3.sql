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
