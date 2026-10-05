-- Run after schema.sql. Replace email with the Owner account email.
select id,email,role,is_suspended from public.profiles order by created_at desc limit 10;
select count(*) as games from public.games;
select count(*) as products from public.game_products;
select name,is_active from public.payment_methods order by created_at;
select key,value from public.settings order by key;
-- After creating an order, verify:
-- select order_code,status,subtotal,discount,admin_fee,total from public.orders order by created_at desc limit 10;
-- select * from public.order_status_history order by created_at desc limit 20;
