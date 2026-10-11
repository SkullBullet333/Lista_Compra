-- Separa o andamento da atividade do pagamento do gasto de viagem.
alter table public.travel_entries
  add column if not exists paid boolean not null default false;
