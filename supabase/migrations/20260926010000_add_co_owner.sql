do $$ begin alter type public.user_role add value if not exists 'co_owner'; exception when duplicate_object then null; end $$;
