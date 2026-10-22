-- Tipo de negócio (restaurante, bar ou pousada): define a configuração inicial e o
-- vocabulário do painel. Pousada dá 1 selo por estadia: gasto mínimo 0 e visitas com valor 0.
alter table public.estabelecimentos
  add column if not exists tipo_negocio text not null default 'restaurante'
  check (tipo_negocio in ('restaurante', 'bar', 'pousada'));

-- Pousada Sonhos do Rosa: selo por estadia, sem gasto mínimo e sem limite de inatividade
update public.estabelecimentos
  set tipo_negocio = 'pousada', gasto_minimo_centavos = 0, dias_inatividade = null
  where slug = 'pousadasonhosdorosa';
