-- Authentication, shared lists, invitations and realtime collaboration.
create type public.list_member_role as enum ('editor', 'viewer');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.list_members (
  list_id text not null references public.shopping_lists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.list_member_role not null default 'editor',
  invited_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (list_id, user_id)
);
create index list_members_user_idx on public.list_members(user_id, list_id);

create table public.list_invitations (
  id uuid primary key default gen_random_uuid(),
  list_id text not null references public.shopping_lists(id) on delete cascade,
  email text not null,
  role public.list_member_role not null default 'editor',
  invited_by uuid not null references auth.users(id) on delete cascade,
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index list_invitations_list_email_idx on public.list_invitations(list_id, lower(email));

create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();

create or replace function public.can_view_list(target_list_id text)
returns boolean language sql stable security definer set search_path = public, pg_temp set row_security = off as $$
  select exists (
    select 1 from public.shopping_lists l
    where l.id = target_list_id
      and (l.user_id = auth.uid() or exists (
        select 1 from public.list_members m where m.list_id = l.id and m.user_id = auth.uid()
      ))
  );
$$;

create or replace function public.can_edit_list(target_list_id text)
returns boolean language sql stable security definer set search_path = public, pg_temp set row_security = off as $$
  select exists (
    select 1 from public.shopping_lists l
    where l.id = target_list_id
      and (l.user_id = auth.uid() or exists (
        select 1 from public.list_members m
        where m.list_id = l.id and m.user_id = auth.uid() and m.role = 'editor'
      ))
  );
$$;

create or replace function public.protect_record_ownership()
returns trigger language plpgsql as $$
begin
  if new.user_id is distinct from old.user_id then new.user_id := old.user_id; end if;
  return new;
end $$;
create trigger shopping_lists_keep_owner before update on public.shopping_lists for each row execute function public.protect_record_ownership();
create trigger list_items_keep_creator before update on public.list_items for each row execute function public.protect_record_ownership();
create trigger travel_entries_keep_creator before update on public.travel_entries for each row execute function public.protect_record_ownership();

create or replace function public.accept_pending_list_invitations()
returns trigger language plpgsql security definer set search_path = public, auth, pg_temp set row_security = off as $$
begin
  insert into public.profiles(id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;

  insert into public.list_members(list_id, user_id, role, invited_by)
  select i.list_id, new.id, i.role, i.invited_by
  from public.list_invitations i
  where lower(i.email) = lower(new.email) and i.accepted_at is null
  on conflict (list_id, user_id) do update set role = excluded.role;

  update public.list_invitations
  set accepted_by = new.id, accepted_at = now()
  where lower(email) = lower(new.email) and accepted_at is null;
  return new;
end $$;
create trigger auth_user_accept_invitations after insert on auth.users for each row execute function public.accept_pending_list_invitations();

create or replace function public.share_list_with_email(target_list_id text, target_email text, target_role public.list_member_role default 'editor')
returns text language plpgsql security definer set search_path = public, auth, pg_temp set row_security = off as $$
declare target_user uuid; normalized_email text := lower(trim(target_email));
begin
  if not exists (select 1 from public.shopping_lists where id = target_list_id and user_id = auth.uid()) then
    raise exception 'Somente o proprietário pode compartilhar esta lista.';
  end if;
  if normalized_email = lower(coalesce(auth.jwt() ->> 'email', '')) then
    raise exception 'A lista já pertence a este e-mail.';
  end if;

  insert into public.list_invitations(list_id, email, role, invited_by)
  values (target_list_id, normalized_email, target_role, auth.uid())
  on conflict do update set role = excluded.role, invited_by = excluded.invited_by;

  select id into target_user from auth.users where lower(email) = normalized_email limit 1;
  if target_user is not null then
    insert into public.list_members(list_id, user_id, role, invited_by)
    values (target_list_id, target_user, target_role, auth.uid())
    on conflict (list_id, user_id) do update set role = excluded.role;
    update public.list_invitations set accepted_by = target_user, accepted_at = now()
    where list_id = target_list_id and lower(email) = normalized_email;
    return 'Compartilhamento ativado.';
  end if;
  return 'Convite salvo. O acesso será ativado quando esse e-mail criar a conta.';
end $$;

create or replace function public.get_list_collaborators(target_list_id text)
returns table(user_id uuid, email text, role text, status text)
language sql stable security definer set search_path = public, auth, pg_temp set row_security = off as $$
  select l.user_id, u.email::text, 'owner'::text, 'active'::text
  from public.shopping_lists l join auth.users u on u.id = l.user_id
  where l.id = target_list_id and public.can_view_list(target_list_id)
  union all
  select m.user_id, u.email::text, m.role::text, 'active'::text
  from public.list_members m join auth.users u on u.id = m.user_id
  where m.list_id = target_list_id and public.can_view_list(target_list_id)
  union all
  select null::uuid, i.email, i.role::text, 'pending'::text
  from public.list_invitations i
  where i.list_id = target_list_id and i.accepted_at is null
    and exists (select 1 from public.shopping_lists l where l.id = target_list_id and l.user_id = auth.uid());
$$;

create or replace function public.remove_list_collaborator(target_list_id text, target_email text)
returns void language plpgsql security definer set search_path = public, auth, pg_temp set row_security = off as $$
declare target_user uuid;
begin
  if not exists (select 1 from public.shopping_lists where id = target_list_id and user_id = auth.uid()) then
    raise exception 'Somente o proprietário pode remover acessos.';
  end if;
  select id into target_user from auth.users where lower(email) = lower(trim(target_email)) limit 1;
  if target_user is not null then delete from public.list_members where list_id = target_list_id and user_id = target_user; end if;
  delete from public.list_invitations where list_id = target_list_id and lower(email) = lower(trim(target_email));
end $$;

alter table public.profiles enable row level security;
alter table public.list_members enable row level security;
alter table public.list_invitations enable row level security;

drop policy if exists "manage own lists" on public.shopping_lists;
drop policy if exists "manage own list items" on public.list_items;
drop policy if exists "manage own travel entries" on public.travel_entries;

create policy "read accessible lists" on public.shopping_lists for select using (public.can_view_list(id));
create policy "create own lists" on public.shopping_lists for insert with check (user_id = auth.uid());
create policy "edit accessible lists" on public.shopping_lists for update using (public.can_edit_list(id)) with check (public.can_edit_list(id));
create policy "delete owned lists" on public.shopping_lists for delete using (user_id = auth.uid());

create policy "read accessible items" on public.list_items for select using (public.can_view_list(list_id));
create policy "create accessible items" on public.list_items for insert with check (user_id = auth.uid() and public.can_edit_list(list_id));
create policy "edit accessible items" on public.list_items for update using (public.can_edit_list(list_id)) with check (public.can_edit_list(list_id));
create policy "delete accessible items" on public.list_items for delete using (public.can_edit_list(list_id));

create policy "read accessible travel entries" on public.travel_entries for select using (public.can_view_list(list_id));
create policy "create accessible travel entries" on public.travel_entries for insert with check (user_id = auth.uid() and public.can_edit_list(list_id));
create policy "edit accessible travel entries" on public.travel_entries for update using (public.can_edit_list(list_id)) with check (public.can_edit_list(list_id));
create policy "delete accessible travel entries" on public.travel_entries for delete using (public.can_edit_list(list_id));

create policy "read own profile" on public.profiles for select using (id = auth.uid());
create policy "update own profile" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "read list memberships" on public.list_members for select using (public.can_view_list(list_id));
create policy "owners manage memberships" on public.list_members for all
using (exists (select 1 from public.shopping_lists l where l.id = list_id and l.user_id = auth.uid()))
with check (exists (select 1 from public.shopping_lists l where l.id = list_id and l.user_id = auth.uid()));
create policy "owners manage invitations" on public.list_invitations for all
using (exists (select 1 from public.shopping_lists l where l.id = list_id and l.user_id = auth.uid()))
with check (exists (select 1 from public.shopping_lists l where l.id = list_id and l.user_id = auth.uid()));

grant select, insert, update, delete on public.profiles, public.list_members, public.list_invitations to authenticated;
grant execute on function public.can_view_list(text), public.can_edit_list(text) to authenticated;
grant execute on function public.share_list_with_email(text, text, public.list_member_role) to authenticated;
grant execute on function public.get_list_collaborators(text) to authenticated;
grant execute on function public.remove_list_collaborator(text, text) to authenticated;

alter table public.shopping_lists replica identity full;
alter table public.list_items replica identity full;
alter table public.travel_entries replica identity full;
do $$ begin
  alter publication supabase_realtime add table public.shopping_lists, public.list_items, public.travel_entries, public.list_members;
exception when duplicate_object then null;
end $$;
