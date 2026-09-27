-- NDRAAAID.v1 - Deposit flow hardening
-- 1) A customer's existing wallet balance must never be a deposit funding method.
-- 2) Enforce this server-side so the restriction cannot be bypassed from the client.

create or replace function public.create_member_deposit(
  p_payment_method_id uuid,
  p_amount numeric,
  p_proof_path text default null,
  p_proof_url text default null,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  uid uuid := auth.uid();
  did uuid;
begin
  if uid is null then raise exception 'UNAUTHORIZED'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'INVALID_DEPOSIT_AMOUNT'; end if;
  if not exists(select 1 from public.profiles where id=uid and is_suspended=false) then
    raise exception 'ACCOUNT_NOT_ALLOWED';
  end if;
  if not exists(select 1 from public.payment_methods where id=p_payment_method_id and is_active=true) then
    raise exception 'PAYMENT_METHOD_NOT_FOUND';
  end if;
  if exists(
    select 1 from public.payment_methods
    where id=p_payment_method_id
      and is_active=true
      and (
        upper(coalesce(kind,''))='WALLET'
        or lower(btrim(coalesce(name,'')))='saldo akun'
      )
  ) then
    raise exception 'WALLET_NOT_ALLOWED_FOR_DEPOSIT';
  end if;

  insert into public.member_deposits(
    deposit_code,user_id,payment_method_id,amount,proof_path,proof_url,note
  )
  values(
    public.make_deposit_code(),uid,p_payment_method_id,p_amount,
    nullif(btrim(p_proof_path),''),
    nullif(btrim(p_proof_url),''),
    nullif(btrim(p_note),'')
  )
  returning id into did;

  insert into public.notifications(user_id,title,body,type)
  values(uid,'Deposit diterima','Permintaan deposit kamu sedang menunggu verifikasi admin.','WALLET');

  return did;
end;
$$;

revoke all on function public.create_member_deposit(uuid,numeric,text,text,text) from public,anon,authenticated;
grant execute on function public.create_member_deposit(uuid,numeric,text,text,text) to authenticated;
