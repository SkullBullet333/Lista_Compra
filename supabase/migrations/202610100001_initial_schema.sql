-- Minhas Listas: catálogo, backup, histórico de preços, modelos e preferências.
create extension if not exists pgcrypto;

create type public.list_type as enum ('market', 'travel');
create type public.theme_mode as enum ('light', 'dark', 'black', 'system');

create table public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme_mode public.theme_mode not null default 'light',
  primary_color text not null default '#059669' check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id text not null,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  color text not null default '#64748b' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (id)
);

create table public.catalog_items (
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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalog_items_owner_name_unique unique nulls not distinct (user_id, normalized_name)
);

create table public.shopping_lists (
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
create index shopping_lists_user_updated_idx on public.shopping_lists(user_id, updated_at desc);

create table public.list_items (
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
create index list_items_list_position_idx on public.list_items(list_id, position);
create index list_items_user_name_idx on public.list_items(user_id, normalized_name, updated_at desc);

create table public.travel_entries (
  id text primary key,
  list_id text not null references public.shopping_lists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  entry_date date not null,
  entry_time time,
  entry_type text not null check (entry_type in ('passeio','comida','bebida','transporte','hospedagem','gasto')),
  amount numeric(12,2) not null default 0 check (amount >= 0),
  notes text,
  done boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.price_history (
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
create index price_history_lookup_idx on public.price_history(user_id, normalized_name, recorded_at desc);

create table public.list_templates (
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

create table public.template_items (
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
create index template_items_template_position_idx on public.template_items(template_id, position);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger user_preferences_updated before update on public.user_preferences for each row execute function public.set_updated_at();
create trigger categories_updated before update on public.categories for each row execute function public.set_updated_at();
create trigger catalog_items_updated before update on public.catalog_items for each row execute function public.set_updated_at();
create trigger shopping_lists_updated before update on public.shopping_lists for each row execute function public.set_updated_at();
create trigger list_items_updated before update on public.list_items for each row execute function public.set_updated_at();
create trigger travel_entries_updated before update on public.travel_entries for each row execute function public.set_updated_at();
create trigger list_templates_updated before update on public.list_templates for each row execute function public.set_updated_at();

create or replace function public.set_previous_item_price() returns trigger language plpgsql security definer set search_path = public as $$
declare prior numeric(12,2);
begin
  select unit_price into prior from public.price_history
    where user_id = new.user_id and normalized_name = new.normalized_name
    order by recorded_at desc limit 1;
  new.previous_price := coalesce(new.previous_price, prior);
  return new;
end $$;
create trigger list_items_previous_price before insert on public.list_items for each row execute function public.set_previous_item_price();

create or replace function public.capture_item_price() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.price <= 0 or (tg_op = 'UPDATE' and old.price = new.price) then return new; end if;
  insert into public.price_history(id, user_id, list_id, list_item_id, catalog_item_id, item_name, normalized_name, unit_price, market_name)
  select 'db-' || gen_random_uuid()::text, new.user_id, new.list_id, new.id, new.catalog_item_id, new.name, new.normalized_name, new.price, shopping_lists.market_name
  from public.shopping_lists where shopping_lists.id = new.list_id;
  return new;
end $$;
create trigger list_items_capture_price after insert or update of price on public.list_items for each row execute function public.capture_item_price();

create or replace view public.latest_item_prices with (security_invoker = true) as
select distinct on (user_id, normalized_name) user_id, normalized_name, item_name, unit_price, market_name, recorded_at
from public.price_history order by user_id, normalized_name, recorded_at desc;

alter table public.user_preferences enable row level security;
alter table public.categories enable row level security;
alter table public.catalog_items enable row level security;
alter table public.shopping_lists enable row level security;
alter table public.list_items enable row level security;
alter table public.travel_entries enable row level security;
alter table public.price_history enable row level security;
alter table public.list_templates enable row level security;
alter table public.template_items enable row level security;

create policy "own preferences" on public.user_preferences for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "read own or system categories" on public.categories for select using (user_id = auth.uid() or is_system);
create policy "manage own categories" on public.categories for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "read own or system catalog" on public.catalog_items for select using (user_id = auth.uid() or is_system);
create policy "manage own catalog" on public.catalog_items for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "manage own lists" on public.shopping_lists for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "manage own list items" on public.list_items for all
using (user_id = auth.uid() and exists (select 1 from public.shopping_lists l where l.id = list_id and l.user_id = auth.uid()))
with check (user_id = auth.uid() and exists (select 1 from public.shopping_lists l where l.id = list_id and l.user_id = auth.uid()));
create policy "manage own travel entries" on public.travel_entries for all
using (user_id = auth.uid() and exists (select 1 from public.shopping_lists l where l.id = list_id and l.user_id = auth.uid()))
with check (user_id = auth.uid() and exists (select 1 from public.shopping_lists l where l.id = list_id and l.user_id = auth.uid()));
create policy "manage own price history" on public.price_history for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "read own or system templates" on public.list_templates for select using (user_id = auth.uid() or is_system);
create policy "manage own templates" on public.list_templates for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "read own or system template items" on public.template_items for select using (user_id = auth.uid() or user_id is null);
create policy "manage own template items" on public.template_items for all using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on public.latest_item_prices to authenticated;
