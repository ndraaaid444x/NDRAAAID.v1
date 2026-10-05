-- NDRAAAID.v1 - Admin/Owner username editing
-- Allows staff with the dedicated users.username.manage permission to change
-- a member's public username without exposing password/email/auth changes.

insert into public.permissions(key, description)
values ('users.username.manage', 'Change member usernames')
on conflict (key) do nothing;

insert into public.role_permissions(role, permission_key)
values
  ('owner'::public.user_role, 'users.username.manage'),
  ('admin'::public.user_role, 'users.username.manage')
on conflict do nothing;

create or replace function public.admin_update_username(
  p_user_id uuid,
  p_username text
)
returns public.profiles
language plpgsql
security definer
set search_path=public
as $$
declare
  actor uuid := auth.uid();
  clean_username text := btrim(coalesce(p_username, ''));
  result public.profiles;
begin
  if actor is null or not public.has_permission('users.username.manage') then
    raise exception 'FORBIDDEN';
  end if;

  if not exists(select 1 from public.profiles where id=p_user_id) then
    raise exception 'USER_NOT_FOUND';
  end if;

  if clean_username !~ '^[A-Za-z0-9._-]{3,30}$' then
    raise exception 'USERNAME_INVALID';
  end if;

  if exists(
    select 1
    from public.profiles
    where lower(username) = lower(clean_username)
      and id <> p_user_id
  ) then
    raise exception 'USERNAME_ALREADY_EXISTS';
  end if;

  update public.profiles
  set username = clean_username,
      updated_at = now()
  where id = p_user_id
  returning * into result;

  insert into public.admin_audit_logs(
    admin_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values(
    actor,
    'CHANGE_USERNAME',
    'profile',
    p_user_id,
    jsonb_build_object('username', clean_username)
  );

  return result;
end;
$$;

revoke all on function public.admin_update_username(uuid,text) from public, anon;
grant execute on function public.admin_update_username(uuid,text) to authenticated;
