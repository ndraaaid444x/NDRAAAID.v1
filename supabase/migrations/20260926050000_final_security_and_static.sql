-- NDRAAAID.v1 FINAL security/deployment hardening
-- This migration is part of the canonical migration chain and must run after BUILD-03.

-- Keep helper predicates compatible with all staff roles.
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles where id=auth.uid() and role in ('owner','co_owner','admin','customer_service') and is_suspended=false);
$$;
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles where id=auth.uid() and role in ('owner','co_owner','admin') and is_suspended=false);
$$;

-- Role changes must never be performed by direct client UPDATE.
create or replace function public.owner_set_role(p_user_id uuid, p_role public.user_role)
returns public.profiles
language plpgsql security definer set search_path=public as $$
declare actor uuid:=auth.uid(); result public.profiles;
begin
  if actor is null or not public.has_permission('users.manage') or not exists(select 1 from public.profiles where id=actor and role='owner' and is_suspended=false) then
    raise exception 'ONLY_OWNER_CAN_CHANGE_ROLE';
  end if;
  if p_user_id=actor then raise exception 'CANNOT_CHANGE_OWN_ROLE'; end if;
  if not exists(select 1 from public.profiles where id=p_user_id) then raise exception 'USER_NOT_FOUND'; end if;
  update public.profiles set role=p_role,updated_at=now() where id=p_user_id returning * into result;
  insert into public.admin_audit_logs(admin_id,action,entity_type,entity_id,metadata)
  values(actor,'CHANGE_USER_ROLE','profile',p_user_id,jsonb_build_object('new_role',p_role::text));
  return result;
end; $$;
revoke all on function public.owner_set_role(uuid,public.user_role) from public,anon,authenticated;
grant execute on function public.owner_set_role(uuid,public.user_role) to authenticated;

-- Remove broad legacy admin policies. The final permission-aware policies below are the security boundary.
DROP POLICY IF EXISTS profiles_admin ON public.profiles;
DROP POLICY IF EXISTS games_admin ON public.games;
DROP POLICY IF EXISTS fields_admin ON public.game_fields;
DROP POLICY IF EXISTS products_admin ON public.game_products;
DROP POLICY IF EXISTS methods_admin ON public.payment_methods;
DROP POLICY IF EXISTS vouchers_admin ON public.vouchers;
DROP POLICY IF EXISTS vouchers_admin_write ON public.vouchers;
DROP POLICY IF EXISTS promotions_admin ON public.promotions;
DROP POLICY IF EXISTS promotions_admin_write ON public.promotions;
DROP POLICY IF EXISTS media_admin ON public.media_assets;
DROP POLICY IF EXISTS settings_admin ON public.settings;
DROP POLICY IF EXISTS broadcasts_admin ON public.broadcasts;
DROP POLICY IF EXISTS admin_audit_logs_admin ON public.admin_audit_logs;
DROP POLICY IF EXISTS audit_admin ON public.admin_audit_logs;
DROP POLICY IF EXISTS game_categories_admin ON public.game_categories;
DROP POLICY IF EXISTS game_categories_public ON public.game_categories;

-- Replace broad legacy self/admin profile rules with explicit self-read + users.manage administration.
DROP POLICY IF EXISTS profiles_self ON public.profiles;
DROP POLICY IF EXISTS profiles_update_self ON public.profiles;
CREATE POLICY profiles_self_read ON public.profiles FOR SELECT TO authenticated USING(auth.uid()=id OR public.has_permission('users.view'));
CREATE POLICY profiles_self_update ON public.profiles FOR UPDATE TO authenticated USING(auth.uid()=id) WITH CHECK(auth.uid()=id);
CREATE POLICY profiles_manage ON public.profiles FOR ALL TO authenticated USING(public.has_permission('users.manage')) WITH CHECK(public.has_permission('users.manage'));

CREATE POLICY games_manage_final ON public.games FOR ALL TO authenticated USING(public.has_permission('catalog.manage')) WITH CHECK(public.has_permission('catalog.manage'));
CREATE POLICY fields_manage_final ON public.game_fields FOR ALL TO authenticated USING(public.has_permission('catalog.manage')) WITH CHECK(public.has_permission('catalog.manage'));
CREATE POLICY products_manage_final ON public.game_products FOR ALL TO authenticated USING(public.has_permission('catalog.manage')) WITH CHECK(public.has_permission('catalog.manage'));
CREATE POLICY methods_manage_final ON public.payment_methods FOR ALL TO authenticated USING(public.has_permission('catalog.manage')) WITH CHECK(public.has_permission('catalog.manage'));
CREATE POLICY categories_public_final ON public.game_categories FOR SELECT USING(is_active=true OR public.has_permission('catalog.manage'));
CREATE POLICY categories_manage_final ON public.game_categories FOR ALL TO authenticated USING(public.has_permission('catalog.manage')) WITH CHECK(public.has_permission('catalog.manage'));
CREATE POLICY vouchers_manage_final ON public.vouchers FOR ALL TO authenticated USING(public.has_permission('marketing.manage')) WITH CHECK(public.has_permission('marketing.manage'));
CREATE POLICY promotions_manage_final ON public.promotions FOR ALL TO authenticated USING(public.has_permission('marketing.manage')) WITH CHECK(public.has_permission('marketing.manage'));
CREATE POLICY media_manage_final ON public.media_assets FOR ALL TO authenticated USING(public.has_permission('catalog.manage')) WITH CHECK(public.has_permission('catalog.manage'));
CREATE POLICY settings_manage_final ON public.settings FOR ALL TO authenticated USING(public.has_permission('settings.manage')) WITH CHECK(public.has_permission('settings.manage'));
CREATE POLICY broadcasts_manage_final ON public.broadcasts FOR ALL TO authenticated USING(public.has_permission('broadcast.manage')) WITH CHECK(public.has_permission('broadcast.manage'));
CREATE POLICY audit_read_final ON public.admin_audit_logs FOR SELECT TO authenticated USING(public.has_permission('audit.view'));

-- Storage: website assets use the same granular catalog permission, not the old is_admin shortcut.
DROP POLICY IF EXISTS website_assets_admin_insert ON storage.objects;
DROP POLICY IF EXISTS website_assets_admin_update ON storage.objects;
DROP POLICY IF EXISTS website_assets_admin_delete ON storage.objects;
CREATE POLICY website_assets_manage_insert_final ON storage.objects FOR INSERT TO authenticated
WITH CHECK(bucket_id='website-assets' AND public.has_permission('catalog.manage'));
CREATE POLICY website_assets_manage_update_final ON storage.objects FOR UPDATE TO authenticated
USING(bucket_id='website-assets' AND public.has_permission('catalog.manage'))
WITH CHECK(bucket_id='website-assets' AND public.has_permission('catalog.manage'));
CREATE POLICY website_assets_manage_delete_final ON storage.objects FOR DELETE TO authenticated
USING(bucket_id='website-assets' AND public.has_permission('catalog.manage'));

-- Keep realtime-safe public reads while protecting all private data through RLS.
GRANT SELECT ON public.games,public.game_fields,public.game_products,public.payment_methods,public.game_categories,public.banners,public.promotions,public.broadcasts,public.settings TO anon,authenticated;

-- Static GitHub Pages has no server runtime. Guest proof upload is therefore handled by the
-- Supabase Edge Function guest-payment-proof, not a Next.js /api route.

-- Never expose a broad profile UPDATE policy: role/suspension changes must use audited RPCs.
DROP POLICY IF EXISTS profiles_manage ON public.profiles;
