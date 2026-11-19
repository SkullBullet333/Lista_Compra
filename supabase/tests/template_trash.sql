begin;
do $$
#variable_conflict use_variable
declare
  actor uuid;
  model_id text := 'trash-template-'||gen_random_uuid();
  old_item uuid := gen_random_uuid();
  replacement uuid := gen_random_uuid();
  item_trash uuid;
  model_trash uuid;
begin
  select id into actor from auth.users limit 1;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
  insert into public.list_templates(id,user_id,name) values(model_id,actor,'Modelo teste');
  insert into public.template_items(id,template_id,user_id,name,category_id,quantity,unit,default_price)
    values(old_item,model_id,actor,'Abacate','feira',1,'un',0);
  delete from public.template_items where id=old_item;
  select id into item_trash from public.trash_bin where source_table='template_items' and record_key->>'id'=old_item::text;
  if (select superseded_at from public.trash_bin where id=item_trash) is not null then raise exception 'Genuine delete was hidden.'; end if;
  insert into public.template_items(id,template_id,user_id,name,category_id,quantity,unit,default_price)
    values(replacement,model_id,actor,'Abacate','feira',1,'un',0);
  if (select superseded_at from public.trash_bin where id=item_trash) is null then raise exception 'Internal rewrite was not recognized.'; end if;
  delete from public.template_items where id=replacement;
  if not exists(select 1 from public.trash_bin where source_table='template_items' and record_key->>'id'=replacement::text and superseded_at is null and parent_trash_id is null) then
    raise exception 'Subsequent real deletion was not kept.'; end if;
  -- A deleted template is one recoverable entry even when cleanup is a later transaction.
  insert into public.template_items(template_id,user_id,name,category_id,quantity,unit,default_price)
    values(model_id,actor,'Outro item','feira',1,'un',0);
  update public.list_templates set is_deleted=true where id=model_id;
  select id into model_trash from public.trash_bin where source_table='list_templates' and record_key->>'id'=model_id;
  delete from public.template_items where template_id=model_id;
  if (select count(*) from public.trash_bin where source_table='template_items' and row_data->>'template_id'=model_id and superseded_at is null and parent_trash_id is null and restored_at is null)<>1 then
    raise exception 'Whole template added extra child entries.'; end if;
  perform public.restore_trash_item(model_trash);
  if not exists(select 1 from public.template_items where template_id=model_id and name='Outro item') then raise exception 'Template restore lost content.'; end if;
end $$;
rollback;
