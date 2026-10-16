-- Métricas do painel. Roda com as permissões de quem chama (o RLS vale):
-- o dono só enxerga o próprio estabelecimento.
--
-- Definições (ver docs/DECISOES.md):
--   • visita de retorno = qualquer visita do cliente que não seja a primeira dele
--   • clientes que retornaram = clientes com pelo menos 1 visita de retorno no período
--   • taxa de retorno = clientes que retornaram ÷ clientes com alguma visita no período
--   • ticket médio = gasto em visitas de retorno ÷ nº de visitas de retorno
--   • plano = plano atual do cliente
--   • visitas desfeitas não contam; clientes com dados apagados (LGPD) continuam nos números,
--     mas não entram em "inativos"
create function public.metricas(p_desde timestamptz, p_plano text default null, p_estab uuid default null)
returns jsonb
language sql stable security invoker set search_path = '' as $$
with
estab as (select coalesce(p_estab, public.meu_estabelecimento()) as id),
clientes_f as (
  select c.id, c.criado_em, c.ultima_visita_em, c.anonimizado_em
  from public.clientes c, estab
  where c.estabelecimento_id = estab.id
    and (p_plano is null or c.plano_tipo = p_plano)
),
visitas_num as (
  select v.cliente_id, v.valor_centavos, v.criado_em,
         row_number() over (partition by v.cliente_id order by v.criado_em, v.id) as ordem
  from public.visitas v
  join clientes_f c on c.id = v.cliente_id
  where v.desfeita_em is null
),
no_periodo as (
  select * from visitas_num where p_desde is null or criado_em >= p_desde
),
resgates as (
  select count(*)::int as n
  from public.eventos_carimbo e
  join clientes_f c on c.id = e.cliente_id
  where e.tipo = 'resgate' and (p_desde is null or e.criado_em >= p_desde)
)
select jsonb_build_object(
  'clientes_cadastrados', (select count(*) from clientes_f where p_desde is null or criado_em >= p_desde),
  'clientes_com_visita', (select count(distinct cliente_id) from no_periodo),
  'clientes_que_retornaram', (select count(distinct cliente_id) from no_periodo where ordem >= 2),
  'visitas_de_retorno', (select count(*) from no_periodo where ordem >= 2),
  'gasto_retorno_centavos', (select coalesce(sum(valor_centavos), 0) from no_periodo where ordem >= 2),
  'total_visitas', (select count(*) from no_periodo),
  'gasto_total_centavos', (select coalesce(sum(valor_centavos), 0) from no_periodo),
  'recompensas_resgatadas', (select n from resgates),
  'clientes_inativos', (
    select count(*) from clientes_f c, estab
    join public.estabelecimentos e on e.id = estab.id
    where c.anonimizado_em is null
      and coalesce(c.ultima_visita_em, c.criado_em) < now() - make_interval(days => e.dias_inatividade)
  )
)
$$;

revoke all on function public.metricas(timestamptz, text, uuid) from public, anon;
grant execute on function public.metricas(timestamptz, text, uuid) to authenticated, service_role;
