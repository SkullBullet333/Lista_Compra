-- Run after the migration in a test database. Uses only synthetic rows, and rolls
-- back the entire transaction, including all audit events. Needs two auth users.
begin;
do $$
#variable_conflict use_variable
declare
  owner_uuid uuid;
  other_uuid uuid;
  list_id text := 'audit-test-' || gen_random_uuid();
  item_id text := 'audit-item-' || gen_random_uuid();
  trip_id text := 'audit-trip-' || gen_random_uuid();
  template_id text := 'audit-template-' || gen_random_uuid();
  template_item_id uuid := gen_random_uuid();
  catalog_id uuid := gen_random_uuid();
  membership_key jsonb;
  trash_uuid uuid;
  child_trash_uuid uuid;
  initial_events bigint;
begin
  select id into owner_uuid from auth.users order by id limit 1;
  select id into other_uuid from auth.users where id<>owner_uuid order by id limit 1;
  if other_uuid is null then raise exception 'Tests need two existing test accounts.'; end if;
  select count(*) into initial_events from public.deletion_logs;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_uuid,'role','authenticated')::text,true);
  perform set_config('request.headers','{"origin":"http://localhost:3000","user-agent":"audit-test","authorization":"must-not-be-logged","apikey":"must-not-be-logged"}',true);

  insert into public.shopping_lists(id,user_id,title,list_type) values(list_id,owner_uuid,'Audit test','market');
  insert into public.list_items(id,list_id,user_id,name,normalized_name,quantity,unit,price)
    values(item_id,list_id,owner_uuid,'Audit item','audit item',1,'un',0);
  insert into public.travel_entries(id,list_id,user_id,title,entry_date,entry_type)
    values(trip_id,list_id,owner_uuid,'Audit trip',current_date,'passeio');
  insert into public.list_members(list_id,user_id,role,invited_by) values(list_id,other_uuid,'editor',owner_uuid);

  -- Composite keys retain both columns.
  delete from public.list_members where list_members.list_id=list_id and user_id=other_uuid;
  select id,record_key into trash_uuid,membership_key from public.trash_bin
    where source_table='list_members' and record_key->>'list_id'=list_id;
  if membership_key is distinct from jsonb_build_object('list_id',list_id,'user_id',other_uuid) then
    raise exception 'Composite primary key was not preserved.'; end if;
  perform public.restore_trash_item(trash_uuid);

  -- Deleting a parent saves complete related rows before cascades or SET NULL.
  delete from public.shopping_lists where id=list_id;
  select id into trash_uuid from public.trash_bin where source_table='shopping_lists' and record_key->>'id'=list_id;
  if not exists(select 1 from public.trash_bin where id=trash_uuid
    and jsonb_array_length(related_data->'list_items')=1
    and jsonb_array_length(related_data->'travel_entries')=1
    and jsonb_array_length(related_data->'list_members')=1) then
    raise exception 'Parent contents were not archived.'; end if;
  if not exists(select 1 from public.deletion_logs where trash_id=trash_uuid and actor_id=owner_uuid
    and request_context->>'origin'='http://localhost:3000'
    and not request_context ? 'authorization' and not request_context ? 'apikey') then
    raise exception 'Audit identity or request metadata is incorrect.'; end if;

  -- The other user cannot restore or read this deletion, despite having been an editor.
  perform set_config('request.jwt.claims',jsonb_build_object('sub',other_uuid,'role','authenticated')::text,true);
  begin
    perform public.restore_trash_item(trash_uuid);
    raise exception 'Unauthorized restore unexpectedly succeeded.';
  exception when insufficient_privilege then null;
  end;
  execute 'set local role authenticated';
  if exists(select 1 from public.trash_bin where id=trash_uuid) then raise exception 'RLS leaked a private snapshot.'; end if;
  execute 'reset role';
  perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_uuid,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  perform public.restore_trash_item(trash_uuid);
  perform public.restore_trash_item(trash_uuid); -- idempotent, no second restore event
  execute 'reset role';
  if not exists(select 1 from public.list_items where id=item_id) or not exists(select 1 from public.travel_entries where id=trip_id) then
    raise exception 'Parent restore lost contents.'; end if;
  if exists(select 1 from public.list_members where list_members.list_id=list_id) then
    raise exception 'Parent restore unexpectedly reactivated sharing.'; end if;
  if (select count(*) from public.deletion_logs where trash_id=trash_uuid and action='restore')<>1 then
    raise exception 'Restore is not idempotent.'; end if;

  -- A direct item delete can be restored by the list owner.
  execute 'set local role authenticated';
  delete from public.list_items where id=item_id;
  select id into child_trash_uuid from public.trash_bin where source_table='list_items' and record_key->>'id'=item_id and restored_at is null order by deleted_at desc limit 1;
  perform public.restore_trash_item(child_trash_uuid);
  execute 'reset role';
  if not exists(select 1 from public.list_items where id=item_id) then raise exception 'Item restore failed.'; end if;

  -- A reused identifier is a conflict, never an overwrite.
  delete from public.list_items where id=item_id;
  select id into child_trash_uuid from public.trash_bin where source_table='list_items' and record_key->>'id'=item_id and restored_at is null order by deleted_at desc limit 1;
  insert into public.list_items(id,list_id,user_id,name,normalized_name,quantity,unit,price)
    values(item_id,list_id,owner_uuid,'Newer item','newer item',1,'un',0);
  begin
    perform public.restore_trash_item(child_trash_uuid);
    raise exception 'Conflict unexpectedly overwritten.';
  exception when unique_violation then null;
  end;
  if (select name from public.list_items where id=item_id)<>'Newer item' then raise exception 'Newer item was overwritten.'; end if;

  -- Soft deletes save the original payload once; repeated tombstones add no events.
  insert into public.catalog_items(id,user_id,name,normalized_name,default_unit,default_price)
    values(catalog_id,owner_uuid,'Audit product','audit-product-'||catalog_id,'un',10);
  update public.catalog_items set is_deleted=true,name='Deleted name' where id=catalog_id;
  select id into trash_uuid from public.trash_bin where source_table='catalog_items' and record_key->>'id'=catalog_id::text;
  update public.catalog_items set is_deleted=true where id=catalog_id;
  if (select count(*) from public.trash_bin where source_table='catalog_items' and record_key->>'id'=catalog_id::text)<>1 then
    raise exception 'Repeated soft deletion duplicated the snapshot.'; end if;
  perform public.restore_trash_item(trash_uuid);
  if not exists(select 1 from public.catalog_items where id=catalog_id and name='Audit product' and not is_deleted) then
    raise exception 'Soft restore did not recover original fields.'; end if;

  -- Models restore their child rows and use fresh snapshots per deletion.
  insert into public.list_templates(id,user_id,name) values(template_id,owner_uuid,'Audit template');
  insert into public.template_items(id,template_id,user_id,name,quantity,unit,default_price)
    values(template_item_id,template_id,owner_uuid,'Template item',1,'un',0);
  update public.list_templates set is_deleted=true where id=template_id;
  delete from public.template_items where template_items.template_id=template_id;
  select id into trash_uuid from public.trash_bin where source_table='list_templates' and record_key->>'id'=template_id;
  perform public.restore_trash_item(trash_uuid);
  if not exists(select 1 from public.template_items where id=template_item_id) then raise exception 'Template restore lost contents.'; end if;

  -- Source deletion is rolled back if the transaction fails, as are its audit rows.
  begin
    delete from public.shopping_lists where id=list_id;
    raise exception 'Rollback probe' using errcode='P0002';
  exception when no_data_found then null;
  end;
  if not exists(select 1 from public.shopping_lists where id=list_id) then raise exception 'Failed delete was committed.'; end if;

  if has_table_privilege('authenticated','public.trash_bin','INSERT')
    or has_table_privilege('authenticated','public.trash_bin','UPDATE')
    or has_table_privilege('authenticated','public.deletion_logs','DELETE')
    or has_function_privilege('anon','public.restore_trash_item(uuid)','EXECUTE')
    or has_function_privilege('authenticated','app_private.capture_deleted_record()','EXECUTE') then
    raise exception 'Audit permissions are too broad.'; end if;
  if (select count(*) from pg_trigger where tgname='capture_deletion' and not tgisinternal)<>14 then
    raise exception 'Application table coverage is incomplete.'; end if;
  if (select count(*) from public.deletion_logs)<=initial_events then raise exception 'No audit events captured.'; end if;
end $$;
rollback;
