-- Inatividade sem limite: dias_inatividade null = o cliente nunca vira "inativo"
-- e o aviso "Sentimos sua falta" não é enviado (negócios de retorno raro, como pousadas).
-- Com número, o limite vai até 3650 dias (10 anos). Os selos nunca vencem, em nenhum caso.
alter table public.estabelecimentos alter column dias_inatividade drop not null;
alter table public.estabelecimentos drop constraint if exists estabelecimentos_dias_inatividade_check;
alter table public.estabelecimentos add constraint estabelecimentos_dias_inatividade_check
  check (dias_inatividade is null or dias_inatividade between 1 and 3650);
