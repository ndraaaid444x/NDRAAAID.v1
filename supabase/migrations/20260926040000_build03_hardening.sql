-- NDRAAAID.v1 BUILD-03 hardening
-- Run after 20260926030000_final_v1.sql

-- 1) Guest tracking must always require the unguessable tracking token.
-- The legacy order-code-only function is intentionally disabled.
drop function if exists public.track_order(text);

-- 2) Guest proof storage is private. Staff with order/finance visibility can read guest proofs.
-- Keep customer-owned proof access for authenticated customers.
drop policy if exists proof_read_owner_admin on storage.objects;
drop policy if exists proof_read_guest_staff on storage.objects;
create policy proof_read_owner_admin on storage.objects
for select to authenticated
using (
  bucket_id='payment-proofs'
  and (
    (storage.foldername(name))[1]=auth.uid()::text
    or public.has_permission('orders.view')
    or public.has_permission('finance.view')
  )
);
create policy proof_read_guest_staff on storage.objects
for select to authenticated
using (
  bucket_id='payment-proofs'
  and (storage.foldername(name))[1]='guest'
  and (public.has_permission('orders.view') or public.has_permission('finance.view'))
);

-- 3) Make guest proof upload idempotent at the application level by rejecting
-- additional proof after payment is already accepted/rejected.
create or replace function public.assert_guest_order_pending(
  p_order_code text,
  p_tracking_token uuid
) returns uuid
language sql
security definer
set search_path=public
as $$
  select o.id
  from public.orders o
  where upper(o.order_code)=upper(btrim(p_order_code))
    and o.tracking_token=p_tracking_token
    and o.user_id is null
    and o.status='PENDING_PAYMENT'
  limit 1;
$$;
revoke all on function public.assert_guest_order_pending(text,uuid) from public,anon,authenticated;
grant execute on function public.assert_guest_order_pending(text,uuid) to anon,authenticated;

-- 4) Keep payment state synchronized when an admin marks an order refunded.
create or replace function public.admin_transition_order(
  p_order_id uuid,
  p_new_status public.order_status,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  actor uuid:=auth.uid();
  old public.order_status;
  uid uuid;
begin
  if actor is null or not public.has_permission('orders.process') then
    raise exception 'FORBIDDEN';
  end if;

  select status,user_id into old,uid
  from public.orders
  where id=p_order_id
  for update;

  if old is null then raise exception 'ORDER_NOT_FOUND'; end if;
  if old='PENDING_PAYMENT' and p_new_status not in ('PAYMENT_RECEIVED','CANCELLED','EXPIRED') then raise exception 'INVALID_TRANSITION'; end if;
  if old='PAYMENT_RECEIVED' and p_new_status not in ('PROCESSING','FAILED','CANCELLED') then raise exception 'INVALID_TRANSITION'; end if;
  if old='PROCESSING' and p_new_status not in ('SUCCESS','FAILED') then raise exception 'INVALID_TRANSITION'; end if;
  if old='SUCCESS' and p_new_status<>'REFUNDED' then raise exception 'INVALID_TRANSITION'; end if;
  if old in ('FAILED','CANCELLED') and p_new_status<>'REFUNDED' then raise exception 'INVALID_TRANSITION'; end if;
  if p_new_status='REFUNDED' and not public.has_permission('orders.refund') then raise exception 'FORBIDDEN'; end if;

  update public.orders
  set status=p_new_status,updated_at=now()
  where id=p_order_id;

  if p_new_status='PAYMENT_RECEIVED' then
    update public.payments set status='PAID',updated_at=now() where order_id=p_order_id;
    update public.payment_proofs
    set verified=true
    where id=(select id from public.payment_proofs where order_id=p_order_id order by created_at desc limit 1);
  elsif p_new_status='SUCCESS' then
    update public.payments set status='PAID',updated_at=now() where order_id=p_order_id;
  elsif p_new_status='FAILED' then
    update public.payments set status='FAILED',updated_at=now() where order_id=p_order_id;
  elsif p_new_status='CANCELLED' then
    update public.payments set status='CANCELLED',updated_at=now() where order_id=p_order_id;
  elsif p_new_status='REFUNDED' then
    update public.payments set status='REFUNDED',updated_at=now() where order_id=p_order_id;
  end if;

  insert into public.order_status_history(order_id,old_status,new_status,changed_by,note)
  values(p_order_id,old,p_new_status,actor,p_note);

  insert into public.admin_audit_logs(admin_id,action,entity_type,entity_id,metadata)
  values(actor,'CHANGE_ORDER_STATUS','order',p_order_id,
    jsonb_build_object('from',old,'to',p_new_status,'note',p_note));

  if uid is not null then
    insert into public.notifications(user_id,title,body,type)
    values(uid,'Status order berubah',
      'Order kamu sekarang berstatus '||replace(p_new_status::text,'_',' ')||'.','ORDER');
  end if;
end;
$$;
revoke all on function public.admin_transition_order(uuid,public.order_status,text) from public,anon,authenticated;
grant execute on function public.admin_transition_order(uuid,public.order_status,text) to authenticated;

-- 5) Prevent direct anonymous inserts into proof records. Guest proofs are inserted
-- only by the server route using the service role after token verification.
drop policy if exists proofs_self_insert on public.payment_proofs;

-- 6) Helpful indexes for the guest flow and admin review.
create index if not exists payment_proofs_order_created_idx
  on public.payment_proofs(order_id,created_at desc);
create index if not exists orders_status_created_idx
  on public.orders(status,created_at desc);
