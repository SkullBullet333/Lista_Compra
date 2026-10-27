-- Execute esta migration após remover apenas as tabelas que serão recriadas.
-- As tabelas list_invitations, list_members, profiles, travel_entries e
-- user_preferences são mantidas. O catálogo é compartilhado entre as contas
-- autenticadas; edições e exclusões são vistas por todos.

create extension if not exists pgcrypto;
do $$ begin
  create type public.list_type as enum ('market', 'travel');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.list_member_role as enum ('editor', 'viewer');
exception when duplicate_object then null; end $$;

create table if not exists public.categories (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  color text not null default '#64748b' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  normalized_name text not null,
  category_id text not null default 'outros',
  default_unit text not null default 'un',
  default_price numeric(12,2) not null default 0 check (default_price >= 0),
  image_url text,
  notes text,
  is_system boolean not null default false,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalog_items_owner_name_unique unique nulls not distinct (user_id, normalized_name)
);
alter table public.catalog_items add column if not exists is_deleted boolean not null default false;

create table if not exists public.shopping_lists (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  list_type public.list_type not null default 'market',
  market_name text,
  destination text,
  target_budget numeric(12,2) check (target_budget is null or target_budget >= 0),
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists shopping_lists_user_updated_idx on public.shopping_lists(user_id, updated_at desc);

create table if not exists public.list_items (
  id text primary key,
  list_id text not null references public.shopping_lists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  catalog_item_id uuid references public.catalog_items(id) on delete set null,
  name text not null,
  normalized_name text not null,
  category_id text not null default 'outros',
  quantity numeric(12,3) not null default 1 check (quantity > 0),
  unit text not null default 'un',
  price numeric(12,2) not null default 0 check (price >= 0),
  previous_price numeric(12,2) check (previous_price is null or previous_price >= 0),
  checked boolean not null default false,
  image_url text,
  notes text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists list_items_list_position_idx on public.list_items(list_id, position);
create index if not exists list_items_user_name_idx on public.list_items(user_id, normalized_name, updated_at desc);

create table if not exists public.price_history (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  list_id text references public.shopping_lists(id) on delete set null,
  list_item_id text references public.list_items(id) on delete set null,
  catalog_item_id uuid references public.catalog_items(id) on delete set null,
  item_name text not null,
  normalized_name text not null,
  unit_price numeric(12,2) not null check (unit_price >= 0),
  market_name text,
  recorded_at timestamptz not null default now()
);
create index if not exists price_history_lookup_idx on public.price_history(user_id, normalized_name, recorded_at desc);

create table if not exists public.list_templates (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  description text not null default '',
  emoji text not null default '🛒',
  market_name text,
  target_budget numeric(12,2),
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.template_items (
  id uuid primary key default gen_random_uuid(),
  template_id text not null references public.list_templates(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  catalog_item_id uuid references public.catalog_items(id) on delete set null,
  name text not null,
  category_id text not null default 'outros',
  quantity numeric(12,3) not null default 1,
  unit text not null default 'un',
  default_price numeric(12,2) not null default 0,
  image_url text,
  notes text,
  position integer not null default 0
);
create index if not exists template_items_template_position_idx on public.template_items(template_id, position);
alter table public.travel_entries add column if not exists paid boolean not null default false;

-- Recupera os IDs usados pelas três tabelas preservadas quando shopping_lists
-- tiver sido removida com CASCADE. Os títulos originais não são recuperáveis.
insert into public.shopping_lists(id, user_id, title, list_type)
select distinct on (source.list_id) source.list_id, source.owner_id,
  case when exists (select 1 from public.travel_entries t where t.list_id = source.list_id)
    then 'Viagem recuperada' else 'Lista recuperada' end,
  case when exists (select 1 from public.travel_entries t where t.list_id = source.list_id)
    then 'travel'::public.list_type else 'market'::public.list_type end
from (
  select list_id, invited_by as owner_id, 1 as priority from public.list_invitations
  union all
  select list_id, invited_by, 2 from public.list_members
  union all
  select list_id, user_id, 3 from public.travel_entries
) source
where not exists (select 1 from public.shopping_lists l where l.id = source.list_id)
order by source.list_id, source.priority
on conflict (id) do nothing;

-- DROP ... CASCADE remove as chaves estrangeiras das tabelas preservadas.
-- NOT VALID mantém linhas antigas órfãs, mas valida todos os novos registros.
do $$ begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.travel_entries'::regclass and conname = 'travel_entries_list_id_fkey') then
    alter table public.travel_entries add constraint travel_entries_list_id_fkey
      foreign key (list_id) references public.shopping_lists(id) on delete cascade not valid;
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.list_members'::regclass and conname = 'list_members_list_id_fkey') then
    alter table public.list_members add constraint list_members_list_id_fkey
      foreign key (list_id) references public.shopping_lists(id) on delete cascade not valid;
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.list_invitations'::regclass and conname = 'list_invitations_list_id_fkey') then
    alter table public.list_invitations add constraint list_invitations_list_id_fkey
      foreign key (list_id) references public.shopping_lists(id) on delete cascade not valid;
  end if;
end $$;

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists categories_updated on public.categories;
create trigger categories_updated before update on public.categories for each row execute function public.set_updated_at();
drop trigger if exists catalog_items_updated on public.catalog_items;
create trigger catalog_items_updated before update on public.catalog_items for each row execute function public.set_updated_at();
drop trigger if exists shopping_lists_updated on public.shopping_lists;
create trigger shopping_lists_updated before update on public.shopping_lists for each row execute function public.set_updated_at();
drop trigger if exists list_items_updated on public.list_items;
create trigger list_items_updated before update on public.list_items for each row execute function public.set_updated_at();
drop trigger if exists list_templates_updated on public.list_templates;
create trigger list_templates_updated before update on public.list_templates for each row execute function public.set_updated_at();

create or replace function public.set_previous_item_price() returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare prior numeric(12,2);
begin
  select unit_price into prior from public.price_history
  where user_id = new.user_id and normalized_name = new.normalized_name
  order by recorded_at desc limit 1;
  new.previous_price := coalesce(new.previous_price, prior);
  return new;
end $$;
drop trigger if exists list_items_previous_price on public.list_items;
create trigger list_items_previous_price before insert on public.list_items for each row execute function public.set_previous_item_price();

create or replace function public.capture_item_price() returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.price <= 0 or (tg_op = 'UPDATE' and old.price = new.price) then return new; end if;
  insert into public.price_history(id, user_id, list_id, list_item_id, catalog_item_id, item_name, normalized_name, unit_price, market_name)
  select 'db-' || gen_random_uuid()::text, new.user_id, new.list_id, new.id, new.catalog_item_id, new.name, new.normalized_name, new.price, l.market_name
  from public.shopping_lists l where l.id = new.list_id;
  return new;
end $$;
drop trigger if exists list_items_capture_price on public.list_items;
create trigger list_items_capture_price after insert or update of price on public.list_items for each row execute function public.capture_item_price();

create or replace function public.can_view_list(target_list_id text)
returns boolean language sql stable security definer set search_path = public, pg_temp set row_security = off as $$
  select exists (select 1 from public.shopping_lists l where l.id = target_list_id
    and (l.user_id = auth.uid() or exists (select 1 from public.list_members m where m.list_id = l.id and m.user_id = auth.uid())));
$$;
create or replace function public.can_edit_list(target_list_id text)
returns boolean language sql stable security definer set search_path = public, pg_temp set row_security = off as $$
  select exists (select 1 from public.shopping_lists l where l.id = target_list_id
    and (l.user_id = auth.uid() or exists (select 1 from public.list_members m where m.list_id = l.id and m.user_id = auth.uid() and m.role = 'editor')));
$$;

create or replace function public.share_list_with_email(
  target_list_id text, target_email text, target_role public.list_member_role default 'editor'
) returns text language plpgsql security definer set search_path = public, auth, pg_temp set row_security = off as $$
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
  on conflict (list_id, (lower(email))) do update set role = excluded.role, invited_by = excluded.invited_by;
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
  from public.list_invitations i where i.list_id = target_list_id and i.accepted_at is null
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
  if target_user is not null then
    delete from public.list_members where list_id = target_list_id and user_id = target_user;
  end if;
  delete from public.list_invitations where list_id = target_list_id and lower(email) = lower(trim(target_email));
end $$;

create or replace function public.protect_record_ownership() returns trigger language plpgsql as $$
begin
  if new.user_id is distinct from old.user_id then new.user_id := old.user_id; end if;
  return new;
end $$;
drop trigger if exists shopping_lists_keep_owner on public.shopping_lists;
create trigger shopping_lists_keep_owner before update on public.shopping_lists for each row execute function public.protect_record_ownership();
drop trigger if exists list_items_keep_creator on public.list_items;
create trigger list_items_keep_creator before update on public.list_items for each row execute function public.protect_record_ownership();
drop trigger if exists travel_entries_keep_creator on public.travel_entries;
create trigger travel_entries_keep_creator before update on public.travel_entries for each row execute function public.protect_record_ownership();

create or replace view public.latest_item_prices with (security_invoker = true) as
select distinct on (user_id, normalized_name) user_id, normalized_name, item_name, unit_price, market_name, recorded_at
from public.price_history order by user_id, normalized_name, recorded_at desc;

alter table public.categories enable row level security;
alter table public.catalog_items enable row level security;
alter table public.shopping_lists enable row level security;
alter table public.list_items enable row level security;
alter table public.price_history enable row level security;
alter table public.list_templates enable row level security;
alter table public.template_items enable row level security;
alter table public.travel_entries enable row level security;
alter table public.list_members enable row level security;
alter table public.list_invitations enable row level security;

drop policy if exists "read own or system categories" on public.categories;
drop policy if exists "manage own categories" on public.categories;
create policy "read own or system categories" on public.categories for select using (user_id = auth.uid() or is_system);
create policy "manage own categories" on public.categories for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "read own or system catalog" on public.catalog_items;
drop policy if exists "manage own catalog" on public.catalog_items;
create policy "read own or system catalog" on public.catalog_items for select using (user_id = auth.uid() or is_system);
create policy "manage own catalog" on public.catalog_items for all using (user_id = auth.uid()) with check (user_id = auth.uid() and not is_system);

drop policy if exists "manage own lists" on public.shopping_lists;
drop policy if exists "read accessible lists" on public.shopping_lists;
drop policy if exists "create own lists" on public.shopping_lists;
drop policy if exists "edit accessible lists" on public.shopping_lists;
drop policy if exists "delete owned lists" on public.shopping_lists;
create policy "read accessible lists" on public.shopping_lists for select using (public.can_view_list(id));
create policy "create own lists" on public.shopping_lists for insert with check (user_id = auth.uid());
create policy "edit accessible lists" on public.shopping_lists for update using (public.can_edit_list(id)) with check (public.can_edit_list(id));
create policy "delete owned lists" on public.shopping_lists for delete using (user_id = auth.uid());

drop policy if exists "manage own list items" on public.list_items;
drop policy if exists "read accessible items" on public.list_items;
drop policy if exists "create accessible items" on public.list_items;
drop policy if exists "edit accessible items" on public.list_items;
drop policy if exists "delete accessible items" on public.list_items;
create policy "read accessible items" on public.list_items for select using (public.can_view_list(list_id));
create policy "create accessible items" on public.list_items for insert with check (user_id = auth.uid() and public.can_edit_list(list_id));
create policy "edit accessible items" on public.list_items for update using (public.can_edit_list(list_id)) with check (public.can_edit_list(list_id));
create policy "delete accessible items" on public.list_items for delete using (public.can_edit_list(list_id));

drop policy if exists "manage own travel entries" on public.travel_entries;
drop policy if exists "read accessible travel entries" on public.travel_entries;
drop policy if exists "create accessible travel entries" on public.travel_entries;
drop policy if exists "edit accessible travel entries" on public.travel_entries;
drop policy if exists "delete accessible travel entries" on public.travel_entries;
create policy "read accessible travel entries" on public.travel_entries for select using (public.can_view_list(list_id));
create policy "create accessible travel entries" on public.travel_entries for insert with check (user_id = auth.uid() and public.can_edit_list(list_id));
create policy "edit accessible travel entries" on public.travel_entries for update using (public.can_edit_list(list_id)) with check (public.can_edit_list(list_id));
create policy "delete accessible travel entries" on public.travel_entries for delete using (public.can_edit_list(list_id));

drop policy if exists "manage own price history" on public.price_history;
create policy "manage own price history" on public.price_history for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "read own or system templates" on public.list_templates;
drop policy if exists "manage own templates" on public.list_templates;
create policy "read own or system templates" on public.list_templates for select using (user_id = auth.uid() or is_system);
create policy "manage own templates" on public.list_templates for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "read own or system template items" on public.template_items;
drop policy if exists "manage own template items" on public.template_items;
create policy "read own or system template items" on public.template_items for select using (user_id = auth.uid() or user_id is null);
create policy "manage own template items" on public.template_items for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "read list memberships" on public.list_members;
drop policy if exists "owners manage memberships" on public.list_members;
create policy "read list memberships" on public.list_members for select using (public.can_view_list(list_id));
create policy "owners manage memberships" on public.list_members for all
using (exists (select 1 from public.shopping_lists l where l.id = list_id and l.user_id = auth.uid()))
with check (exists (select 1 from public.shopping_lists l where l.id = list_id and l.user_id = auth.uid()));
drop policy if exists "owners manage invitations" on public.list_invitations;
create policy "owners manage invitations" on public.list_invitations for all
using (exists (select 1 from public.shopping_lists l where l.id = list_id and l.user_id = auth.uid()))
with check (exists (select 1 from public.shopping_lists l where l.id = list_id and l.user_id = auth.uid()));

grant select, insert, update, delete on public.categories, public.catalog_items, public.shopping_lists,
  public.list_items, public.price_history, public.list_templates, public.template_items,
  public.travel_entries, public.list_members, public.list_invitations to authenticated;
grant select on public.latest_item_prices to authenticated;
grant execute on function public.can_view_list(text), public.can_edit_list(text) to authenticated;
grant execute on function public.share_list_with_email(text, text, public.list_member_role),
  public.get_list_collaborators(text), public.remove_list_collaborator(text, text) to authenticated;

-- Restaura a publicação das tabelas recriadas sem duplicar entradas já presentes.
alter table public.shopping_lists replica identity full;
alter table public.list_items replica identity full;
alter table public.travel_entries replica identity full;
do $$
declare table_name text;
begin
  foreach table_name in array array['shopping_lists', 'list_items', 'travel_entries', 'list_members'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = table_name) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end $$;

insert into public.categories(id, user_id, name, color, is_system) values
('feira', null, 'Feira & Hortifrúti', '#16a34a', true),
('padaria', null, 'Padaria & Grãos', '#d97706', true),
('mercearia', null, 'Mercearia & Despensa', '#ea580c', true),
('carnes', null, 'Carnes & Frios', '#e11d48', true),
('laticinios', null, 'Laticínios', '#0284c7', true),
('limpeza', null, 'Higiene & Limpeza', '#7c3aed', true),
('bebidas', null, 'Bebidas', '#0d9488', true),
('outros', null, 'Outros Itens', '#475569', true)
on conflict (id) do nothing;

insert into public.list_templates(id, user_id, name, description, emoji, market_name, target_budget, is_system) values
('feira', null, 'Feira Saudável', 'Frutas & legumes', '🍎', 'Hortifrúti da Vila', 85, true),
('basica', null, 'Despensa Básica', 'Arroz, feijão, café', '🛒', 'Supermercado Atacadista', 200, true),
('cafe', null, 'Café & Lanche', 'Pães, queijo, leite', '☕', 'Padaria & Confeitaria', 60, true),
('churrasco', null, 'Churrasco Amigos', 'Carnes & bebidas', '🥩', 'Empório de Carnes', 250, true)
on conflict (id) do nothing;
insert into public.template_items(template_id, user_id, name, category_id, quantity, unit, default_price, position)
select v.template_id, null, v.name, v.category_id, v.quantity, v.unit, v.default_price, v.position
from (values
('basica', 'Arroz', 'mercearia', 1, 'pct', 28.90, 0),
('basica', 'Feijão', 'mercearia', 2, 'pct', 7.90, 1),
('basica', 'Café', 'mercearia', 1, 'pct', 19.90, 2),
('cafe', 'Pão', 'padaria', 1, 'kg', 16.90, 0),
('cafe', 'Leite', 'laticinios', 2, 'un', 5.49, 1),
('feira', 'Banana', 'feira', 1, 'kg', 6.90, 0),
('feira', 'Maçã', 'feira', 1, 'kg', 9.80, 1)
) as v(template_id, name, category_id, quantity, unit, default_price, position)
where not exists (select 1 from public.template_items t where t.template_id = v.template_id and t.position = v.position and t.user_id is null);

-- Catálogo compartilhado e itens iniciais editáveis.

create table if not exists public.catalog_mode (
  id boolean primary key default true check (id),
  shared_edit_enabled boolean not null default true
);
insert into public.catalog_mode (id, shared_edit_enabled) values (true, true)
on conflict (id) do update set shared_edit_enabled = true;
alter table public.catalog_mode enable row level security;
revoke all on public.catalog_mode from anon, authenticated;

create or replace function public.shared_catalog_edit_enabled()
returns boolean language sql stable security definer
set search_path = public, pg_temp set row_security = off as $$
  select coalesce((select shared_edit_enabled from public.catalog_mode where id = true), false);
$$;
revoke all on function public.shared_catalog_edit_enabled() from public, anon;
grant execute on function public.shared_catalog_edit_enabled() to authenticated;

drop policy if exists "manage own catalog" on public.catalog_items;
create policy "manage own catalog" on public.catalog_items
for all to authenticated
using (user_id = auth.uid() and not public.shared_catalog_edit_enabled())
with check (user_id = auth.uid() and not is_system and not public.shared_catalog_edit_enabled());

drop policy if exists "manage shared catalog" on public.catalog_items;
create policy "manage shared catalog" on public.catalog_items
for all to authenticated
using (user_id is null and is_system and public.shared_catalog_edit_enabled())
with check (user_id is null and is_system and public.shared_catalog_edit_enabled());

create table if not exists public.catalog_items_personal_archive (
  original_id uuid primary key,
  original_user_id uuid not null,
  row_data jsonb not null,
  archived_at timestamptz not null default now()
);
alter table public.catalog_items_personal_archive enable row level security;
revoke all on public.catalog_items_personal_archive from anon, authenticated;

-- Cópia integral para permitir restaurar a antiga divisão por usuário depois.
insert into public.catalog_items_personal_archive (original_id, original_user_id, row_data)
select id, user_id, to_jsonb(item)
from public.catalog_items item
where user_id is not null
on conflict (original_id) do nothing;

-- Os 38 produtos iniciais do aplicativo passam a existir também no banco.
insert into public.catalog_items
  (user_id, name, normalized_name, category_id, default_unit, default_price, image_url, is_system)
values
  (null, 'Maçã', 'maçã', 'feira', 'kg', 9.80, 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&auto=format&fit=crop&q=80', true),
  (null, 'Banana', 'banana', 'feira', 'kg', 6.90, 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&auto=format&fit=crop&q=80', true),
  (null, 'Tomate', 'tomate', 'feira', 'kg', 8.50, 'https://images.unsplash.com/photo-1546470427-227c7369a94d?w=400&auto=format&fit=crop&q=80', true),
  (null, 'Alface', 'alface', 'feira', 'un', 3.50, 'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=400&auto=format&fit=crop&q=80', true),
  (null, 'Cebola', 'cebola', 'feira', 'kg', 5.80, 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=400&auto=format&fit=crop&q=80', true),
  (null, 'Batata', 'batata', 'feira', 'kg', 6.20, 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&auto=format&fit=crop&q=80', true),
  (null, 'Cenoura', 'cenoura', 'feira', 'kg', 5.40, 'https://images.unsplash.com/photo-1598170845058-32b9d6a5c317?w=400&auto=format&fit=crop&q=80', true),
  (null, 'Abacate', 'abacate', 'feira', 'un', 4.90, 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=400&auto=format&fit=crop&q=80', true),
  (null, 'Laranja', 'laranja', 'feira', 'kg', 4.80, 'https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=400&auto=format&fit=crop&q=80', true),
  (null, 'Pão', 'pão', 'padaria', 'kg', 16.90, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80', true),
  (null, 'Pão de Forma', 'pão de forma', 'padaria', 'pct', 9.50, 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=400&auto=format&fit=crop&q=80', true),
  (null, 'Croissant', 'croissant', 'padaria', 'un', 6.50, 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&auto=format&fit=crop&q=80', true),
  (null, 'Granola', 'granola', 'padaria', 'pct', 14.80, 'https://images.unsplash.com/photo-1517093157656-b9ec81640a1b?w=400&auto=format&fit=crop&q=80', true),
  (null, 'Arroz', 'arroz', 'mercearia', 'pct', 28.90, 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&auto=format&fit=crop&q=80', true),
  (null, 'Feijão', 'feijão', 'mercearia', 'pct', 7.90, 'https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=400&auto=format&fit=crop&q=80', true),
  (null, 'Azeite', 'azeite', 'mercearia', 'un', 42.00, 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&auto=format&fit=crop&q=80', true),
  (null, 'Café', 'café', 'mercearia', 'pct', 19.90, 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&auto=format&fit=crop&q=80', true),
  (null, 'Macarrão', 'macarrão', 'mercearia', 'pct', 4.80, 'https://images.unsplash.com/photo-1551462147-37885acc36f1?w=400&auto=format&fit=crop&q=80', true),
  (null, 'Molho de Tomate', 'molho de tomate', 'mercearia', 'un', 3.20, 'https://images.unsplash.com/photo-1598514982205-f36b96d1e8d4?w=400&auto=format&fit=crop&q=80', true),
  (null, 'Açúcar', 'açúcar', 'mercearia', 'pct', 4.90, 'https://images.unsplash.com/photo-1622484216257-268670845a7c?w=400&auto=format&fit=crop&q=80', true),
  (null, 'Peito de Frango', 'peito de frango', 'carnes', 'kg', 21.90, 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400&auto=format&fit=crop&q=80', true),
  (null, 'Carne Moída', 'carne moída', 'carnes', 'kg', 38.90, 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&auto=format&fit=crop&q=80', true),
  (null, 'Picanha', 'picanha', 'carnes', 'kg', 79.90, 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&auto=format&fit=crop&q=80', true),
  (null, 'Presunto', 'presunto', 'carnes', 'g', 0.05, 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&auto=format&fit=crop&q=80', true),
  (null, 'Ovos', 'ovos', 'carnes', 'dz', 12.90, 'https://images.unsplash.com/photo-1516448620398-c5f44bf9f441?w=400&auto=format&fit=crop&q=80', true),
  (null, 'Leite', 'leite', 'laticinios', 'un', 5.49, 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&auto=format&fit=crop&q=80', true),
  (null, 'Queijo', 'queijo', 'laticinios', 'pct', 14.50, 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400&auto=format&fit=crop&q=80', true),
  (null, 'Manteiga', 'manteiga', 'laticinios', 'un', 11.90, 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400&auto=format&fit=crop&q=80', true),
  (null, 'Iogurte', 'iogurte', 'laticinios', 'un', 4.20, 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&auto=format&fit=crop&q=80', true),
  (null, 'Requeijão', 'requeijão', 'laticinios', 'un', 8.90, 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&auto=format&fit=crop&q=80', true),
  (null, 'Detergente', 'detergente', 'limpeza', 'un', 2.90, 'https://images.unsplash.com/photo-1585837575652-267c041d77d4?w=400&auto=format&fit=crop&q=80', true),
  (null, 'Sabão em Pó', 'sabão em pó', 'limpeza', 'cx', 18.90, 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=80', true),
  (null, 'Amaciante', 'amaciante', 'limpeza', 'un', 22.90, 'https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?w=400&auto=format&fit=crop&q=80', true),
  (null, 'Papel Higiênico', 'papel higiênico', 'limpeza', 'pct', 19.80, 'https://images.unsplash.com/photo-1584556812952-905ffd0c611a?w=400&auto=format&fit=crop&q=80', true),
  (null, 'Creme Dental', 'creme dental', 'limpeza', 'un', 5.60, 'https://images.unsplash.com/photo-1559591937-e62fb330bc1f?w=400&auto=format&fit=crop&q=80', true),
  (null, 'Suco de Laranja', 'suco de laranja', 'bebidas', 'un', 12.90, 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400&auto=format&fit=crop&q=80', true),
  (null, 'Água Mineral', 'água mineral', 'bebidas', 'un', 2.50, 'https://images.unsplash.com/photo-1560023907-5f339617ea30?w=400&auto=format&fit=crop&q=80', true),
  (null, 'Cerveja', 'cerveja', 'bebidas', 'un', 4.80, 'https://images.unsplash.com/photo-1608270118837-1481b37f4077?w=400&auto=format&fit=crop&q=80', true)
on conflict (user_id, normalized_name) do nothing;

-- Se mais de uma conta personalizou o mesmo produto, prevalece a edição recente.
-- Itens excluídos também são promovidos, preservando a exclusão para todos.
with latest as (
  select distinct on (normalized_name)
    name, normalized_name, category_id, default_unit, default_price,
    image_url, notes, is_deleted
  from public.catalog_items
  where user_id is not null
  order by normalized_name, updated_at desc, id desc
)
insert into public.catalog_items
  (user_id, name, normalized_name, category_id, default_unit, default_price,
   image_url, notes, is_system, is_deleted)
select null, name, normalized_name, category_id, default_unit, default_price,
       image_url, notes, true, is_deleted
from latest
on conflict (user_id, normalized_name) do update set
  name = excluded.name,
  category_id = excluded.category_id,
  default_unit = excluded.default_unit,
  default_price = excluded.default_price,
  image_url = excluded.image_url,
  notes = excluded.notes,
  is_system = true,
  is_deleted = excluded.is_deleted;

-- Elimina as duas linhas ativas (global + pessoal) do mesmo produto.
delete from public.catalog_items where user_id is not null;
update public.catalog_items set is_system = true where user_id is null and not is_system;

alter table public.catalog_items replica identity full;
do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'catalog_items'
  ) then
    alter publication supabase_realtime add table public.catalog_items;
  end if;
end $$;

-- Para voltar ao modo por usuário, altere shared_edit_enabled para false
-- e configure NEXT_PUBLIC_SHARED_CATALOG_EDIT=false no aplicativo.
