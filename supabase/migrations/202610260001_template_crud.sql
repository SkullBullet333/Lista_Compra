-- As exclusões e edições de modelos padrão são registradas por usuário.
-- O modelo original do sistema permanece disponível para outras contas.
alter table public.list_templates
  add column if not exists is_deleted boolean not null default false;
