-- Notificações pelo cartão (Wallet + cartão web).

-- Ciclo do cartão no momento do envio: "falta pouco" e "recompensa disponível" saem uma vez por ciclo
alter table public.envios add column ciclo int;
create index envios_cliente_tipo_idx on public.envios (cliente_id, automacao_tipo, criado_em desc);
create index campanhas_agendadas_idx on public.campanhas (agendada_para) where status = 'agendada';

-- O dono vê o próprio envio/campanha pelo RLS (já existente). Criação e envio passam pelo servidor.

-- ---------------------------------------------------------------------------
-- Candidatos às automáticas diárias (chamado pela tarefa agendada, só no servidor)
--   • sentimos_falta: sem visita há X dias (X = dias de inatividade), uma vez por período de inatividade
--   • recompensa_esquecida: recompensa disponível há mais de 15 dias, uma vez por recompensa
-- ---------------------------------------------------------------------------
create function public.candidatos_automaticos()
returns table (estabelecimento_id uuid, cliente_id uuid, tipo text)
language sql stable security definer set search_path = '' as $$
  select c.estabelecimento_id, c.id, 'sentimos_falta'
  from public.clientes c
  join public.estabelecimentos e on e.id = c.estabelecimento_id and e.ativo
  join public.automacoes a on a.estabelecimento_id = c.estabelecimento_id and a.tipo = 'sentimos_falta'
  where c.anonimizado_em is null
    and ((c.plano_tipo = 'morador' and a.ativa_morador) or (c.plano_tipo = 'turista' and a.ativa_turista))
    and coalesce(c.ultima_visita_em, c.criado_em) < now() - make_interval(days => e.dias_inatividade)
    and not exists (
      select 1 from public.envios s
      where s.cliente_id = c.id and s.automacao_tipo = 'sentimos_falta'
        and s.criado_em > coalesce(c.ultima_visita_em, c.criado_em)
    )
  union all
  select c.estabelecimento_id, c.id, 'recompensa_esquecida'
  from public.clientes c
  join public.estabelecimentos e on e.id = c.estabelecimento_id and e.ativo
  join public.automacoes a on a.estabelecimento_id = c.estabelecimento_id and a.tipo = 'recompensa_esquecida'
  where c.anonimizado_em is null
    and ((c.plano_tipo = 'morador' and a.ativa_morador) or (c.plano_tipo = 'turista' and a.ativa_turista))
    and c.recompensa_desde < now() - interval '15 days'
    and not exists (
      select 1 from public.envios s
      where s.cliente_id = c.id and s.automacao_tipo = 'recompensa_esquecida' and s.criado_em > c.recompensa_desde
    )
$$;

revoke all on function public.candidatos_automaticos() from public, anon, authenticated;
grant execute on function public.candidatos_automaticos() to service_role;
