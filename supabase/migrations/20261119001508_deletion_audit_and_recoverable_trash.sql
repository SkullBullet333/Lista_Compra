-- All captures and restores participate in the source transaction.
-- No backfill: records deleted before this migration are not recovered.
create schema if not exists app_private;
revoke all on schema app_private from public, anon;
grant usage on schema app_private to authenticated;

create table public.trash_bin (
  id uuid primary key default gen_random_uuid(),
  source_schema text not null default 'public',
  source_table text not null,
  record_key jsonb not null check (jsonb_typeof(record_key) = 'object'),
  row_data jsonb not null check (jsonb_typeof(row_data) = 'object'),
  related_data jsonb not null default '{}',
  deletion_kind text not null check (deletion_kind in ('delete', 'soft_delete')),
  source_operation text not null check (source_operation in ('DELETE', 'UPDATE', 'INSERT')),
  owner_id uuid,
  deleted_by uuid,
  deleted_at timestamptz not null default clock_timestamp(),
  transaction_id bigint not null default txid_current(),
  restored_at timestamptz,
  restored_by uuid
);
create index trash_bin_owner_date_idx on public.trash_bin(owner_id, deleted_at desc);
create index trash_bin_actor_date_idx on public.trash_bin(deleted_by, deleted_at desc);
create index trash_bin_record_idx on public.trash_bin(source_table, (record_key->>'id'), transaction_id);

create table public.deletion_logs (
  id uuid primary key default gen_random_uuid(),
  trash_id uuid not null references public.trash_bin(id) on delete restrict,
  action text not null check (action in ('delete', 'soft_delete', 'restore')),
  source_table text not null,
  record_key jsonb not null,
  owner_id uuid,
  actor_id uuid,
  occurred_at timestamptz not null default clock_timestamp(),
  transaction_id bigint not null default txid_current(),
  database_role text not null,
  request_context jsonb not null default '{}'
);
create index deletion_logs_trash_idx on public.deletion_logs(trash_id, occurred_at);
create index deletion_logs_owner_date_idx on public.deletion_logs(owner_id, occurred_at desc);
create index deletion_logs_actor_date_idx on public.deletion_logs(actor_id, occurred_at desc);

alter table public.trash_bin enable row level security;
alter table public.deletion_logs enable row level security;
revoke all on public.trash_bin, public.deletion_logs from public, anon, authenticated, service_role;
grant select on public.trash_bin, public.deletion_logs to authenticated, service_role;
create policy "read own deleted records" on public.trash_bin for select to authenticated
  using (owner_id = (select auth.uid()) or deleted_by = (select auth.uid()));
create policy "read own deletion events" on public.deletion_logs for select to authenticated
  using (owner_id = (select auth.uid()) or actor_id = (select auth.uid()));

-- Only selected, non-secret request headers are kept. Never persist JWTs or API keys.
create function app_private.deletion_request_context() returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare headers jsonb;
begin
  begin
    headers := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
  exception when invalid_text_representation then headers := '{}';
  end;
  return jsonb_strip_nulls(jsonb_build_object(
    'origin', left(headers->>'origin', 500),
    'referer', left(split_part(headers->>'referer', '?', 1), 500),
    'user_agent', left(headers->>'user-agent', 1000),
    'request_id', left(coalesce(headers->>'x-request-id', headers->>'cf-ray'), 200),
    'client', left(headers->>'x-client-info', 200),
    'session_user', session_user
  ));
end $$;

-- Privileged only to write immutable audit records after the source RLS has allowed
-- the operation. This trigger cannot be called through the Data API.
create function app_private.capture_deleted_record() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  snapshot jsonb;
  related jsonb := '{}';
  key_data jsonb := '{}';
  key_column text;
  actor uuid := auth.uid();
  owner uuid;
  parent_owner uuid;
  parent_id text;
  trash_id uuid := gen_random_uuid();
  kind text;
  system_template jsonb;
  original_template_id text;
begin
  if tg_table_schema <> 'public' or tg_table_name not in (
    'shopping_lists','list_items','travel_entries','categories','catalog_items',
    'list_templates','template_items','price_history','profiles','user_preferences',
    'list_members','list_invitations','catalog_mode','catalog_items_personal_archive'
  ) then raise exception 'Tabela não autorizada para auditoria.'; end if;
  if tg_op = 'DELETE' then snapshot := to_jsonb(old); kind := 'delete';
  elsif tg_op = 'UPDATE' then
    if not coalesce((to_jsonb(new)->>'is_deleted')::boolean, false)
      or coalesce((to_jsonb(old)->>'is_deleted')::boolean, false) then return new; end if;
    snapshot := to_jsonb(old); kind := 'soft_delete';
  elsif tg_op = 'INSERT' then
    if not coalesce((to_jsonb(new)->>'is_deleted')::boolean, false) then return new; end if;
    snapshot := to_jsonb(new); kind := 'soft_delete';
  else raise exception 'Operação não autorizada para auditoria.';
  end if;
  foreach key_column in array tg_argv loop
    key_data := key_data || jsonb_build_object(key_column, snapshot->key_column);
  end loop;
  owner := nullif(coalesce(snapshot->>'user_id', snapshot->>'original_user_id'), '')::uuid;
  if tg_table_name = 'profiles' then owner := (snapshot->>'id')::uuid; end if;

  -- An inserted template tombstone can hide a system template. Keep its effective
  -- content, rather than just the empty override sent by the client.
  if tg_table_name = 'list_templates' and tg_op = 'INSERT' then
    original_template_id := substring(snapshot->>'id' from 38);
    select to_jsonb(t) into system_template from public.list_templates t
      where t.id = original_template_id and t.is_system and not t.is_deleted;
    if system_template is not null then
      snapshot := system_template || jsonb_build_object('id',snapshot->>'id','user_id',owner,'is_system',false,'is_deleted',false);
    end if;
  end if;

  if tg_table_name = 'shopping_lists' then
    select jsonb_build_object(
      'list_items', coalesce((select jsonb_agg(to_jsonb(i) order by i.position) from public.list_items i where i.list_id = old.id), '[]'),
      'travel_entries', coalesce((select jsonb_agg(to_jsonb(i) order by i.position) from public.travel_entries i where i.list_id = old.id), '[]'),
      'list_members', coalesce((select jsonb_agg(to_jsonb(i)) from public.list_members i where i.list_id = old.id), '[]'),
      'list_invitations', coalesce((select jsonb_agg(to_jsonb(i)) from public.list_invitations i where i.list_id = old.id), '[]')
    ) into related;
  elsif tg_table_name = 'list_templates' then
    if system_template is not null then
      select jsonb_build_object('template_items', coalesce(jsonb_agg(to_jsonb(i) ||
        jsonb_build_object('id',gen_random_uuid(),'template_id',snapshot->>'id','user_id',owner) order by i.position), '[]'))
        into related from public.template_items i where i.template_id = original_template_id;
    else
      select jsonb_build_object('template_items', coalesce(jsonb_agg(to_jsonb(i) order by i.position), '[]'))
        into related from public.template_items i where i.template_id = snapshot->>'id';
    end if;
  end if;

  parent_id := snapshot->>'list_id';
  if parent_id is not null and tg_table_name in ('list_items','travel_entries','list_members','list_invitations') then
    select l.user_id into parent_owner from public.shopping_lists l where l.id = parent_id;
    if parent_owner is null then
      select t.owner_id into parent_owner from public.trash_bin t
        where t.source_table = 'shopping_lists' and t.record_key->>'id' = parent_id
          and t.transaction_id = txid_current() order by t.deleted_at desc limit 1;
    end if;
    owner := coalesce(parent_owner, owner);
  elsif tg_table_name = 'template_items' then
    select t.user_id into parent_owner from public.list_templates t where t.id = snapshot->>'template_id';
    if parent_owner is null then
      select t.owner_id into parent_owner from public.trash_bin t
        where t.source_table = 'list_templates' and t.record_key->>'id' = snapshot->>'template_id'
          and t.transaction_id = txid_current() order by t.deleted_at desc limit 1;
    end if;
    owner := coalesce(parent_owner, owner);
  end if;

  insert into public.trash_bin(id,source_table,record_key,row_data,related_data,deletion_kind,source_operation,owner_id,deleted_by)
    values (trash_id,tg_table_name,key_data,snapshot,related,kind,tg_op,owner,actor);
  insert into public.deletion_logs(trash_id,action,source_table,record_key,owner_id,actor_id,database_role,request_context)
    values (trash_id,kind,tg_table_name,key_data,owner,actor,coalesce(nullif(current_setting('role',true),'none'),session_user),app_private.deletion_request_context());
  if tg_op = 'DELETE' then return old; else return new; end if;
end $$;

create function app_private.prevent_unaudited_truncate() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  raise exception 'TRUNCATE bloqueado em %. Use DELETE para preservar o log e a lixeira.', tg_table_name;
end $$;

-- Attach to every current application table, including composite primary keys.
do $$
declare entry record; arguments text;
begin
  for entry in select c.oid,c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='r' and c.relname in (
      'shopping_lists','list_items','travel_entries','categories','catalog_items',
      'list_templates','template_items','price_history','profiles','user_preferences',
      'list_members','list_invitations','catalog_mode','catalog_items_personal_archive')
  loop
    select string_agg(quote_literal(a.attname), ',' order by k.ordinality) into arguments
    from pg_index i cross join lateral unnest(i.indkey) with ordinality k(attnum,ordinality)
    join pg_attribute a on a.attrelid=i.indrelid and a.attnum=k.attnum
    where i.indrelid=entry.oid and i.indisprimary;
    if arguments is null then raise exception 'A tabela % precisa de chave primária.',entry.relname; end if;
    execute format('create trigger capture_deletion before delete on public.%I for each row execute function app_private.capture_deleted_record(%s)',entry.relname,arguments);
    execute format('create trigger prevent_unaudited_truncate before truncate on public.%I for each statement execute function app_private.prevent_unaudited_truncate()',entry.relname);
    if entry.relname in ('catalog_items','list_templates') then
      execute format('create trigger capture_soft_deletion before update of is_deleted on public.%I for each row when (new.is_deleted and not old.is_deleted) execute function app_private.capture_deleted_record(%s)',entry.relname,arguments);
      execute format('create trigger capture_inserted_tombstone after insert on public.%I for each row when (new.is_deleted) execute function app_private.capture_deleted_record(%s)',entry.relname,arguments);
    end if;
  end loop;
end $$;

-- Private helper. The caller has already checked permissions and the table allowlist.
create function app_private.insert_restored_row(table_name text, snapshot jsonb) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  execute format('insert into public.%I select * from jsonb_populate_record(null::public.%I, $1)', table_name, table_name) using snapshot;
end $$;

create function app_private.restore_trash_item(target_trash_id uuid) returns jsonb
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

revoke all on function app_private.deletion_request_context(), app_private.capture_deleted_record(),
  app_private.prevent_unaudited_truncate(), app_private.insert_restored_row(text,jsonb),
  app_private.restore_trash_item(uuid) from public, anon, authenticated, service_role;
grant execute on function app_private.restore_trash_item(uuid) to authenticated;
create function public.restore_trash_item(target_trash_id uuid) returns jsonb
language sql security invoker set search_path = '' as $$
  select app_private.restore_trash_item(target_trash_id);
$$;
revoke all on function public.restore_trash_item(uuid) from public, anon;
grant execute on function public.restore_trash_item(uuid) to authenticated;

comment on table public.trash_bin is 'Snapshots for future deletes, including soft deletes. No automatic expiration. Restore through restore_trash_item; no direct client writes.';
comment on table public.deletion_logs is 'Append-only deletion and restoration history. Request context is diagnostic, never an authorization source.';
comment on function public.restore_trash_item(uuid) is 'Restores an authorized snapshot atomically without overwriting existing records. Parent content is restored; sharing is not reactivated automatically.';
