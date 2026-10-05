-- NDRAAAID Email Auth V4
-- Jalankan hanya jika Anda ingin memastikan trigger profile tetap aman.
-- PENTING: status "Confirm email" berada di Supabase Auth Settings, bukan di SQL.

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path=public
as $$
begin
  insert into public.profiles(id,name,username,email,phone)
  values(
    new.id,
    new.raw_user_meta_data->>'name',
    nullif(new.raw_user_meta_data->>'username',''),
    new.email,
    new.raw_user_meta_data->>'phone'
  )
  on conflict(id) do update set email=excluded.email;
  insert into public.wallets(user_id) values(new.id) on conflict(user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();
