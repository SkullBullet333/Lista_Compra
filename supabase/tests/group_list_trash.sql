-- Only synthetic app rows are used. Source rows, snapshots and logs roll back.
begin;
do $$
#variable_conflict use_variable
declare
  actor uuid;
  market_id text := 'trash-group-market-'||gen_random_uuid();
  travel_id text := 'trash-group-travel-'||gen_random_uuid();
  solo_item text := 'trash-group-solo-'||gen_random_uuid();
  remaining_item text := 'trash-group-other-'||gen_random_uuid();
  travel_item text := 'trash-group-activity-'||gen_random_uuid();
  product_id uuid := gen_random_uuid();
  category_id text := 'custom-trash-group-'||gen_random_uuid();
  root_trash uuid;
  solo_trash uuid;
begin
  select id into actor from auth.users limit 1;
  if actor is null then raise exception 'Test needs an auth user.'; end if;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);

  insert into public.shopping_lists(id,user_id,title,list_type) values(market_id,actor,'Mercado original','market'),(travel_id,actor,'Viagem original','travel');
  insert into public.list_items(id,list_id,user_id,name,normalized_name,quantity,unit,price) values
    (solo_item,market_id,actor,'Individual','individual',1,'un',0),
    (remaining_item,market_id,actor,'Na lista','na lista',1,'un',0);
  delete from public.list_items where id=solo_item;
  select id into solo_trash from public.trash_bin where source_table='list_items' and record_key->>'id'=solo_item;
  if not exists(select 1 from public.trash_bin where id=solo_trash and parent_trash_id is null
    and origin_list_name='Mercado original' and origin_list_id=market_id and origin_list_type='market') then
    raise exception 'Individual item lost origin metadata.'; end if;
  update public.shopping_lists set title='Mercado renomeado' where id=market_id;
  delete from public.shopping_lists where id=market_id;
  select id into root_trash from public.trash_bin where source_table='shopping_lists' and record_key->>'id'=market_id;
  -- Emulate a cleanup DELETE after the parent, also covering schemas without a FK.
  delete from public.list_items where id=remaining_item;
  if exists(select 1 from public.trash_bin where source_table='list_items' and record_key->>'id'=remaining_item) then
    raise exception 'Whole market list produced a separate item entry.'; end if;
  if (select origin_list_name from public.trash_bin where id=solo_trash)<>'Mercado original' then
    raise exception 'Renaming the list changed the historical origin.'; end if;
  perform public.restore_trash_item(root_trash);
  if not exists(select 1 from public.list_items where id=remaining_item)
    or exists(select 1 from public.list_items where id=solo_item) then
    raise exception 'Restoring the list recovered the wrong contents.'; end if;
  perform public.restore_trash_item(solo_trash);
  if not exists(select 1 from public.list_items where id=solo_item) then raise exception 'Standalone restore failed.'; end if;

  insert into public.travel_entries(id,list_id,user_id,title,entry_date,entry_type)
    values(travel_item,travel_id,actor,'Passeio',current_date,'passeio');
  delete from public.shopping_lists where id=travel_id;
  select id into root_trash from public.trash_bin where source_table='shopping_lists' and record_key->>'id'=travel_id;
  if exists(select 1 from public.trash_bin where source_table='travel_entries' and row_data->>'list_id'=travel_id) then
    raise exception 'Travel cascade created a separate trash entry.'; end if;
  if not exists(select 1 from public.deletion_logs where trash_id=root_trash and source_table='travel_entries' and record_key->>'id'=travel_item) then
    raise exception 'Travel cascade audit event was lost.'; end if;
  if (select jsonb_array_length(related_data->'travel_entries') from public.trash_bin where id=root_trash)<>1 then
    raise exception 'Travel snapshot incomplete.'; end if;
  perform public.restore_trash_item(root_trash);
  if not exists(select 1 from public.travel_entries where id=travel_item) then raise exception 'Complete travel restore failed.'; end if;
  delete from public.travel_entries where id=travel_item;
  if not exists(select 1 from public.trash_bin where source_table='travel_entries' and record_key->>'id'=travel_item
    and origin_list_name='Viagem original' and origin_list_type='travel' and parent_trash_id is null) then
    raise exception 'Individual travel activity did not retain its own entry.'; end if;

  insert into public.categories(id,user_id,name,color) values(category_id,actor,'Categoria teste','#123456');
  delete from public.categories where id=category_id;
  insert into public.catalog_items(id,user_id,name,normalized_name) values(product_id,actor,'Produto teste','trash-group-'||product_id);
  update public.catalog_items set is_deleted=true where id=product_id;
  if not exists(select 1 from public.trash_bin where source_table='categories' and record_key->>'id'=category_id and parent_trash_id is null)
    or not exists(select 1 from public.trash_bin where source_table='catalog_items' and record_key->>'id'=product_id::text and parent_trash_id is null) then
    raise exception 'Settings products or categories stopped being archived.'; end if;
end $$;
rollback;
