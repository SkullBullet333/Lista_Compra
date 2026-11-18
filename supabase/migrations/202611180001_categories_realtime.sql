-- Categories use the same authenticated Realtime flow as lists.
-- Periodic reconciliation also works before this migration is applied.
alter table public.categories replica identity full;

do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'categories'
  ) then
    alter publication supabase_realtime add table public.categories;
  end if;
end $$;
