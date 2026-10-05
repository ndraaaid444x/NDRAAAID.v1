-- NDRAAAID V5 Hardening / Bug Fix Migration
-- Run this ONCE on an existing NDRAAAID database after the previous schema/migrations.

-- 1) Wallet deposit approvals were inserting type='DEPOSIT' while the old
--    constraint did not allow that value.
do $$
begin
  alter table public.wallet_transactions drop constraint if exists wallet_transactions_type_check;
  alter table public.wallet_transactions
    add constraint wallet_transactions_type_check
    check(type in ('ADMIN_CREDIT','ADMIN_DEBIT','ORDER_PAYMENT','REFUND','ADJUSTMENT','DEPOSIT'));
exception when duplicate_object then null;
end $$;

-- 2) Prevent duplicate simultaneously-open chat rooms for one customer.
-- Keep the newest OPEN room and close older duplicates before adding the index.
with ranked as (
  select id,
         row_number() over (partition by user_id order by created_at desc, id desc) as rn
  from public.chat_rooms
  where status='OPEN'
)
update public.chat_rooms r
set status='CLOSED'
from ranked x
where r.id=x.id and x.rn>1;

create unique index if not exists chat_rooms_one_open_per_user_idx
  on public.chat_rooms(user_id) where status='OPEN';

-- 3) Publish broadcasts through a server-side function so the admin action
--    has one consistent permission/validation path.
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
  if actor is null or not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  if nullif(btrim(p_title),'') is null then raise exception 'BROADCAST_TITLE_REQUIRED'; end if;
  if nullif(btrim(p_message),'') is null then raise exception 'BROADCAST_MESSAGE_REQUIRED'; end if;
  if upper(coalesce(p_type,'PROMO')) not in ('INFO','PROMO','WARNING','SUCCESS') then raise exception 'INVALID_BROADCAST_TYPE'; end if;

  insert into public.broadcasts(title,message,type,starts_at,ends_at,link_url,link_label,is_active,created_by)
  values(
    btrim(p_title), btrim(p_message), upper(coalesce(p_type,'PROMO')),
    started, started + make_interval(mins => mins),
    nullif(btrim(p_link_url),''), nullif(btrim(p_link_label),''),
    true, actor
  )
  returning * into result;
  return result;
end;
$$;

revoke execute on function public.create_broadcast(text,text,text,integer,text,text) from public,anon,authenticated;
grant execute on function public.create_broadcast(text,text,text,integer,text,text) to authenticated;

-- 4) Make realtime explicit for broadcasts/chat on databases where the
--    publication was never updated.
do $$
begin
  alter publication supabase_realtime add table public.broadcasts;
exception when duplicate_object then null; when undefined_object then null; end $$;

do $$
begin
  alter publication supabase_realtime add table public.chat_messages;
exception when duplicate_object then null; when undefined_object then null; end $$;
