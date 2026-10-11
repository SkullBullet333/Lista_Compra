-- Corrige a atualização de convites repetidos identificando a chave do conflito.
create or replace function public.share_list_with_email(
  target_list_id text,
  target_email text,
  target_role public.list_member_role default 'editor'
)
returns text
language plpgsql
security definer
set search_path = public, auth, pg_temp
set row_security = off
as $$
declare
  target_user uuid;
  normalized_email text := lower(trim(target_email));
begin
  if not exists (
    select 1 from public.shopping_lists
    where id = target_list_id and user_id = auth.uid()
  ) then
    raise exception 'Somente o proprietário pode compartilhar esta lista.';
  end if;

  if normalized_email = lower(coalesce(auth.jwt() ->> 'email', '')) then
    raise exception 'A lista já pertence a este e-mail.';
  end if;

  insert into public.list_invitations(list_id, email, role, invited_by)
  values (target_list_id, normalized_email, target_role, auth.uid())
  on conflict (list_id, (lower(email))) do update
  set role = excluded.role, invited_by = excluded.invited_by;

  select id into target_user
  from auth.users
  where lower(email) = normalized_email
  limit 1;

  if target_user is not null then
    insert into public.list_members(list_id, user_id, role, invited_by)
    values (target_list_id, target_user, target_role, auth.uid())
    on conflict (list_id, user_id) do update set role = excluded.role;

    update public.list_invitations
    set accepted_by = target_user, accepted_at = now()
    where list_id = target_list_id and lower(email) = normalized_email;
    return 'Compartilhamento ativado.';
  end if;

  return 'Convite salvo. O acesso será ativado quando esse e-mail criar a conta.';
end $$;

grant execute on function public.share_list_with_email(text, text, public.list_member_role) to authenticated;
