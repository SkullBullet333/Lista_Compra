-- Synthetic snapshots only. A cutoff in 1900 excludes all real app records.
-- All test changes, including purge events, are rolled back at the end.
begin;
do $$
declare
  owner_uuid uuid;
  other_uuid uuid;
  target uuid := gen_random_uuid();
  other_user uuid := gen_random_uuid();
  restored uuid := gen_random_uuid();
  newer uuid := gen_random_uuid();
  editor_copy uuid := gen_random_uuid();
  shared_catalog uuid := gen_random_uuid();
  result jsonb;
  blocked boolean := false;
begin
  if exists(select 1 from public.trash_bin where deleted_at<='1900-01-01Z'::timestamptz) then
    raise exception 'Reserved test cutoff is not empty. No purge performed.'; end if;
  select id into owner_uuid from auth.users order by id limit 1;
  select id into other_uuid from auth.users where id<>owner_uuid order by id limit 1;
  if other_uuid is null then raise exception 'Tests require two accounts.'; end if;
  insert into public.trash_bin(id,source_table,record_key,row_data,related_data,deletion_kind,source_operation,owner_id,deleted_by,deleted_at,restored_at)
  values
    (target,'categories',jsonb_build_object('id','empty-trash-test-'||target),'{"name":"Test"}','{"secret":"test"}','delete','DELETE',owner_uuid,owner_uuid,'1899-01-01Z',null),
    (other_user,'categories',jsonb_build_object('id',other_user),'{"name":"Other user"}','{}','delete','DELETE',other_uuid,other_uuid,'1899-01-01Z',null),
    (restored,'categories',jsonb_build_object('id',restored),'{"name":"Restored"}','{}','delete','DELETE',owner_uuid,owner_uuid,'1899-01-01Z',now()),
    (newer,'categories',jsonb_build_object('id',newer),'{"name":"Newer"}','{}','delete','DELETE',owner_uuid,owner_uuid,'1901-01-01Z',null),
    (editor_copy,'list_items',jsonb_build_object('id',editor_copy),'{"name":"Another owner"}','{}','delete','DELETE',other_uuid,owner_uuid,'1899-01-01Z',null),
    (shared_catalog,'catalog_items',jsonb_build_object('id',shared_catalog),'{"name":"Shared"}','{}','delete','DELETE',null,owner_uuid,'1899-01-01Z',null);
  insert into public.trash_bin(source_table,record_key,row_data,deletion_kind,source_operation,owner_id,deleted_by,deleted_at)
    select 'categories',jsonb_build_object('id',gen_random_uuid()),'{"name":"Page test"}','delete','DELETE',owner_uuid,owner_uuid,'1899-01-01Z'
    from generate_series(1,55);
  insert into public.deletion_logs(trash_id,action,source_table,record_key,owner_id,actor_id,database_role)
    select id,'delete',source_table,record_key,owner_id,deleted_by,'test' from public.trash_bin where id=target;

  perform set_config('request.jwt.claims','{}',true);
  begin
    perform public.empty_trash('1900-01-01Z');
    raise exception 'Anonymous purge unexpectedly succeeded.';
  exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_uuid,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  result := public.preview_empty_trash();
  if (result->>'count')::bigint<57 or result->>'cutoff' is null then raise exception 'Preview incomplete.'; end if;
  result := public.empty_trash('1900-01-01Z');
  if (result->>'count')::bigint<>57 then raise exception 'Incorrect purge scope: %',result; end if;
  result := public.empty_trash('1900-01-01Z');
  if (result->>'count')::bigint<>0 then raise exception 'Purge is not idempotent.'; end if;
  begin
    perform public.restore_trash_item(target);
  exception when raise_exception then blocked := true; end;
  if not blocked then raise exception 'Purged record could be restored.'; end if;
  execute 'reset role';
  if not exists(select 1 from public.trash_bin where id=target and row_data='{}' and related_data='{}' and purged_by=owner_uuid and purged_at is not null) then
    raise exception 'Payload was not cleared.'; end if;
  if exists(select 1 from public.trash_bin where id in (other_user,restored,newer,editor_copy) and purged_at is not null) then
    raise exception 'Another owner, restored, or newer record was purged.'; end if;
  if (select count(*) from public.deletion_logs where trash_id=target and action in ('delete','purge'))<>2 then
    raise exception 'Original audit history was not preserved.'; end if;
  if has_table_privilege('authenticated','public.trash_bin','UPDATE')
    or has_table_privilege('authenticated','public.trash_bin','DELETE')
    or has_function_privilege('anon','public.empty_trash(timestamptz)','EXECUTE') then
    raise exception 'Purge permissions too broad.'; end if;
end $$;
rollback;
