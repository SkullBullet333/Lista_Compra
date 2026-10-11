-- A caixa de seleção da viagem representa diretamente o pagamento.
update public.travel_entries
set paid = done
where paid is distinct from done;
