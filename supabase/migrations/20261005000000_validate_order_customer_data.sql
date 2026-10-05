-- Validasi server-side customer_data terhadap game_fields.
-- Dipasang sebagai trigger BEFORE INSERT pada orders, sehingga berlaku untuk
-- create_manual_order, create_guest_order, dan jalur wallet tanpa mengubah fungsi-fungsi tersebut.
-- Hanya INSERT: order lama dan transisi status tidak terpengaruh.
-- Tidak menyentuh harga, provider, maupun TRANSACTION_ENABLED.

create or replace function public.validate_order_customer_data()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  f record;
  v text;
begin
  if new.customer_data is null or jsonb_typeof(new.customer_data) <> 'object' then
    raise exception 'INVALID_CUSTOMER_DATA';
  end if;

  for f in
    select key, label, required
    from public.game_fields
    where game_id = new.game_id
  loop
    v := btrim(coalesce(new.customer_data ->> f.key, ''));

    if f.required and v = '' then
      raise exception 'FIELD_REQUIRED: %', f.label;
    end if;

    if length(v) > 100 then
      raise exception 'FIELD_TOO_LONG: %', f.label;
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_validate_order_customer_data on public.orders;
create trigger trg_validate_order_customer_data
before insert on public.orders
for each row execute function public.validate_order_customer_data();

-- Rollback bila diperlukan:
-- drop trigger if exists trg_validate_order_customer_data on public.orders;
-- drop function if exists public.validate_order_customer_data();
