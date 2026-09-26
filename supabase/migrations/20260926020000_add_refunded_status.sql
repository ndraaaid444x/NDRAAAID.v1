do $$ begin alter type public.order_status add value if not exists 'REFUNDED'; exception when duplicate_object then null; end $$;
