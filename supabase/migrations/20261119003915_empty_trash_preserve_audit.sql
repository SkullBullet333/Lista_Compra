-- Clear recovery payloads while preserving immutable audit references.
alter table public.trash_bin add column purged_at timestamptz, add column purged_by uuid;
alter table public.deletion_logs drop constraint deletion_logs_action_check;
alter table public.deletion_logs add constraint deletion_logs_action_check
  check (action in ('delete','soft_delete','restore','purge'));

create function public.preview_empty_trash() returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare actor uuid := auth.uid(); cutoff timestamptz := statement_timestamp(); total bigint;
begin
  if actor is null then raise exception 'Entre na sua conta para esvaziar a lixeira.' using errcode='42501'; end if;
  select count(*) into total from public.trash_bin t
    where t.restored_at is null and t.purged_at is null and t.deleted_at<=cutoff
      and (t.owner_id=actor or (t.owner_id is null and t.deleted_by=actor))
      and t.source_table in ('shopping_lists','list_items','travel_entries','categories','catalog_items',
        'list_templates','template_items','price_history','profiles','user_preferences','list_members','list_invitations');
  return jsonb_build_object('count',total,'cutoff',cutoff);
end $$;
revoke all on function public.preview_empty_trash() from public,anon;
grant execute on function public.preview_empty_trash() to authenticated;

create function app_private.empty_trash(before_timestamp timestamptz) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); total bigint;
begin
  if actor is null then raise exception 'Entre na sua conta para esvaziar a lixeira.' using errcode='42501'; end if;
  if before_timestamp is null or before_timestamp>statement_timestamp() then
    raise exception 'Atualize a lixeira e confirme novamente.'; end if;
  -- Serialize with restore_trash_item; newer deletions survive the confirmation.
  -- An editor cannot destroy another list owner's recovery copies.
  with purged as (
    update public.trash_bin t set row_data='{}',related_data='{}',purged_at=clock_timestamp(),purged_by=actor
      where t.restored_at is null and t.purged_at is null and t.deleted_at<=before_timestamp
        and (t.owner_id=actor or (t.owner_id is null and t.deleted_by=actor))
        and t.source_table in ('shopping_lists','list_items','travel_entries','categories','catalog_items',
          'list_templates','template_items','price_history','profiles','user_preferences','list_members','list_invitations')
      returning t.*
  ), logged as (
    insert into public.deletion_logs(trash_id,action,source_table,record_key,owner_id,actor_id,database_role,request_context)
      select t.id,'purge',t.source_table,t.record_key,t.owner_id,actor,
        coalesce(nullif(current_setting('role',true),'none'),session_user),app_private.deletion_request_context()
      from purged t returning id
  ) select count(*) into total from logged;
  return jsonb_build_object('count',total);
end $$;
revoke all on function app_private.empty_trash(timestamptz) from public,anon,authenticated,service_role;
grant execute on function app_private.empty_trash(timestamptz) to authenticated;
create function public.empty_trash(before_timestamp timestamptz) returns jsonb
language sql security invoker set search_path = '' as $$
  select app_private.empty_trash(before_timestamp);
$$;
revoke all on function public.empty_trash(timestamptz) from public,anon;
grant execute on function public.empty_trash(timestamptz) to authenticated;

comment on column public.trash_bin.purged_at is 'Recovery payloads were permanently cleared. Metadata remains for immutable deletion logs.';

create or replace function app_private.restore_trash_item(target_trash_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  entry public.trash_bin%rowtype;
  actor uuid := auth.uid();
  snapshot jsonb;
  predicate text;
  assignments text;
  current_row jsonb;
  child jsonb;
  child_table text;
  parent_column text;
  parent_owner uuid;
  shared_catalog boolean;
begin
  if actor is null then raise exception 'Entre na sua conta para restaurar.' using errcode='42501'; end if;
  select * into entry from public.trash_bin where id=target_trash_id for update;
  if not found or (entry.owner_id is distinct from actor and entry.deleted_by is distinct from actor) then
    raise exception 'Registro indisponível para restauração.' using errcode='42501';
  end if;
  if entry.source_schema <> 'public' or entry.source_table not in (
    'shopping_lists','list_items','travel_entries','categories','catalog_items','list_templates','template_items',
    'price_history','profiles','user_preferences','list_members','list_invitations'
  ) then raise exception 'Este registro precisa ser restaurado pelo administrador.'; end if;
  if entry.purged_at is not null then raise exception 'Este registro foi removido definitivamente da lixeira.'; end if;
  snapshot := entry.row_data;
  -- Membership at deletion time alone must never confer access to a list now.
  if entry.source_table in ('list_items','travel_entries') then
    if not public.can_edit_list(snapshot->>'list_id') then
      raise exception 'Restaure primeiro a lista e confirme sua permissão de edição.' using errcode='42501'; end if;
  elsif entry.source_table in ('list_members','list_invitations') then
    if not exists(select 1 from public.shopping_lists l where l.id=snapshot->>'list_id' and l.user_id=actor) then
      raise exception 'Somente o dono da lista pode restaurar um compartilhamento.' using errcode='42501'; end if;
  elsif entry.source_table = 'template_items' then
    select user_id into parent_owner from public.list_templates where id=snapshot->>'template_id' and not is_deleted;
    if not found or parent_owner is distinct from actor then
      raise exception 'Restaure primeiro o modelo da sua conta.' using errcode='42501'; end if;
  elsif entry.source_table = 'catalog_items' and snapshot->>'user_id' is null then
    select shared_edit_enabled into shared_catalog from public.catalog_mode limit 1;
    if not coalesce(shared_catalog,false) or not coalesce((snapshot->>'is_system')::boolean,false) then
      raise exception 'Sem permissão para restaurar este produto.' using errcode='42501'; end if;
  elsif entry.owner_id is distinct from actor then
    raise exception 'Somente o dono pode restaurar este registro.' using errcode='42501';
  end if;
  if entry.restored_at is not null then return jsonb_build_object('id',entry.id,'already_restored',true); end if;
  if exists(select 1 from public.trash_bin t where t.source_table=entry.source_table and t.record_key=entry.record_key
    and t.deleted_at>entry.deleted_at) then raise exception 'Use a exclusão mais recente deste registro.'; end if;

  select string_agg(format('%I = %L',key,value), ' and ') into predicate from jsonb_each_text(entry.record_key);
  if predicate is null then raise exception 'Chave de restauração inválida.'; end if;
  execute format('select to_jsonb(t) from public.%I t where %s for update',entry.source_table,predicate) into current_row;
  if entry.source_table in ('catalog_items','list_templates') then
    snapshot := snapshot || jsonb_build_object('is_deleted',false,'updated_at',clock_timestamp());
  elsif snapshot ? 'updated_at' then
    snapshot := snapshot || jsonb_build_object('updated_at',clock_timestamp());
  end if;
  if current_row is not null then
    if current_row->>'user_id' is distinct from snapshot->>'user_id' then
      raise exception 'O identificador agora pertence a outro cadastro. Nada foi sobrescrito.' using errcode='23505';
    end if;
    if entry.deletion_kind <> 'soft_delete' or not coalesce((current_row->>'is_deleted')::boolean,false) then
      raise exception 'Já existe um registro com este identificador. Nada foi sobrescrito.' using errcode='23505';
    end if;
    select string_agg(format('%I = r.%I',a.attname,a.attname), ',') into assignments
      from pg_attribute a where a.attrelid=format('public.%I',entry.source_table)::regclass
      and a.attnum>0 and not a.attisdropped and not (entry.record_key ? a.attname) and a.attname <> 'user_id';
    execute format('update public.%I t set %s from jsonb_populate_record(null::public.%I,$1) r where %s',
      entry.source_table,assignments,entry.source_table,
      (select string_agg(format('t.%I = %L',key,value),' and ') from jsonb_each_text(entry.record_key))) using snapshot;
  else
    perform app_private.insert_restored_row(entry.source_table,snapshot);
  end if;

  -- Restore contents with the parent, but never reactivate sharing automatically.
  -- Existing orphan children of this parent are preserved, never overwritten.
  if entry.source_table in ('shopping_lists','list_templates') then
    foreach child_table in array case when entry.source_table='shopping_lists' then array['list_items','travel_entries'] else array['template_items'] end loop
      parent_column := case when child_table='template_items' then 'template_id' else 'list_id' end;
      for child in select value from jsonb_array_elements(coalesce(entry.related_data->child_table,'[]')) loop
        execute format('select to_jsonb(t) from public.%I t where id::text=$1 for update',child_table) into current_row using child->>'id';
        if current_row is null then perform app_private.insert_restored_row(child_table,child);
        elsif current_row->>parent_column is distinct from snapshot->>'id' then
          raise exception 'Um item já pertence a outro registro. Nada foi sobrescrito.' using errcode='23505';
        end if;
      end loop;
    end loop;
    with restored_children as (update public.trash_bin t set restored_at=clock_timestamp(),restored_by=actor
      where t.restored_at is null and t.transaction_id=entry.transaction_id
      and (t.owner_id=actor or t.deleted_by=actor)
      and ((entry.source_table='shopping_lists' and t.source_table in ('list_items','travel_entries') and t.row_data->>'list_id'=snapshot->>'id')
        or (entry.source_table='list_templates' and t.source_table='template_items' and t.row_data->>'template_id'=snapshot->>'id'))
      returning t.*)
    insert into public.deletion_logs(trash_id,action,source_table,record_key,owner_id,actor_id,database_role,request_context)
      select c.id,'restore',c.source_table,c.record_key,c.owner_id,actor,
        coalesce(nullif(current_setting('role',true),'none'),session_user),app_private.deletion_request_context()
      from restored_children c;
  end if;
  update public.trash_bin set restored_at=clock_timestamp(),restored_by=actor where id=entry.id;
  insert into public.deletion_logs(trash_id,action,source_table,record_key,owner_id,actor_id,database_role,request_context)
    values(entry.id,'restore',entry.source_table,entry.record_key,entry.owner_id,actor,
      coalesce(nullif(current_setting('role',true),'none'),session_user),app_private.deletion_request_context());
  return jsonb_build_object('id',entry.id,'source_table',entry.source_table,'record_key',entry.record_key);
end $$;
