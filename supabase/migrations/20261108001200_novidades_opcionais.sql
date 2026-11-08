-- LGPD: aceite de novidades e promoções SEPARADO do aceite do programa (art. 8º, § 4º).
--   • O aceite do programa (obrigatório) cobre só o cartão: carimbos, recompensas e avisos do próprio cartão.
--   • Novidades e promoções (mensagens personalizadas do dono e "Sentimos sua falta") só para quem marcou
--     a caixa opcional, que começa desmarcada. O cliente pode ligar e desligar no próprio cartão.

-- Quando o cliente aceitou receber novidades (null = não aceitou ou desligou)
alter table public.clientes add column novidades_aceitas_em timestamptz;

-- O registro de cada aceite também guarda se as novidades foram aceitas
alter table public.consentimentos add column novidades boolean not null default false;

-- Quem já se cadastrou aceitou a versão 1, que incluía "me envie mensagens pelo cartão":
-- mantém as mensagens para essas pessoas (podem desligar no cartão).
update public.consentimentos set novidades = true where versao_texto = 1;
update public.clientes c
set novidades_aceitas_em = (select min(s.aceito_em) from public.consentimentos s where s.cliente_id = c.id)
where c.anonimizado_em is null;

-- Versão 2 do texto de consentimento (src/lib/dominio/consentimento.ts)
alter table public.estabelecimentos alter column versao_politica set default 2;
update public.estabelecimentos set versao_politica = 2 where versao_politica < 2;

-- ---------------------------------------------------------------------------
-- Cadastro: agora recebe a escolha das novidades (padrão: não)
-- ---------------------------------------------------------------------------
drop function public.cadastrar_cliente(text, text, text, text, text);

create function public.cadastrar_cliente(
  p_slug text,
  p_nome text,
  p_telefone text,
  p_plano text,
  p_ip_hash text,
  p_aceita_novidades boolean default false
)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_estab public.estabelecimentos;
  v_planos_ativos text[];
  v_plano text;
  v_cliente public.clientes;
begin
  select * into v_estab from public.estabelecimentos where slug = p_slug;
  if not found then
    return jsonb_build_object('status', 'nao_encontrado');
  end if;
  if not v_estab.ativo then
    return jsonb_build_object('status', 'inativo');
  end if;

  -- já tem cartão? devolve o mesmo (é assim que se recupera ao trocar de celular)
  select * into v_cliente from public.clientes
  where estabelecimento_id = v_estab.id and telefone = p_telefone and anonimizado_em is null;
  if found then
    -- marcou a caixa de novidades agora: liga (desmarcada não desliga; para isso há o botão no cartão)
    if coalesce(p_aceita_novidades, false) and v_cliente.novidades_aceitas_em is null then
      update public.clientes set novidades_aceitas_em = now() where id = v_cliente.id;
      insert into public.auditoria (estabelecimento_id, acao, alvo_tipo, alvo_id, depois, ip_hash)
      values (v_estab.id, 'cliente.novidades', 'cliente', v_cliente.id::text, jsonb_build_object('aceita', true), p_ip_hash);
    end if;
    return jsonb_build_object('status', 'existente', 'token', v_cliente.token_cartao, 'codigo', v_cliente.codigo);
  end if;

  select array_agg(tipo order by tipo) into v_planos_ativos
  from public.planos where estabelecimento_id = v_estab.id and ativo;

  -- um só plano ativo: a pergunta nem aparece, usa esse
  if array_length(v_planos_ativos, 1) = 1 then
    v_plano := v_planos_ativos[1];
  elsif p_plano = any (v_planos_ativos) then
    v_plano := p_plano;
  else
    return jsonb_build_object('status', 'plano_invalido');
  end if;

  begin
    insert into public.clientes (estabelecimento_id, nome, telefone, codigo, plano_tipo, novidades_aceitas_em)
    values (v_estab.id, btrim(p_nome), p_telefone, public.gerar_codigo_cartao(v_estab.id), v_plano,
            case when coalesce(p_aceita_novidades, false) then now() end)
    returning * into v_cliente;
  exception when unique_violation then
    -- dois envios ao mesmo tempo com o mesmo telefone: devolve o que ficou gravado
    select * into v_cliente from public.clientes
    where estabelecimento_id = v_estab.id and telefone = p_telefone and anonimizado_em is null;
    if found then
      return jsonb_build_object('status', 'existente', 'token', v_cliente.token_cartao, 'codigo', v_cliente.codigo);
    end if;
    raise;
  end;

  insert into public.passes (estabelecimento_id, cliente_id) values (v_estab.id, v_cliente.id);
  insert into public.consentimentos (estabelecimento_id, cliente_id, versao_texto, ip_hash, novidades)
  values (v_estab.id, v_cliente.id, v_estab.versao_politica, p_ip_hash, coalesce(p_aceita_novidades, false));
  insert into public.auditoria (estabelecimento_id, acao, alvo_tipo, alvo_id, depois, ip_hash)
  values (v_estab.id, 'cliente.cadastro', 'cliente', v_cliente.id::text,
          jsonb_build_object('codigo', v_cliente.codigo, 'plano', v_plano, 'novidades', coalesce(p_aceita_novidades, false)), p_ip_hash);

  return jsonb_build_object('status', 'criado', 'token', v_cliente.token_cartao, 'codigo', v_cliente.codigo);
end $$;

revoke all on function public.cadastrar_cliente(text, text, text, text, text, boolean) from public, anon, authenticated;
grant execute on function public.cadastrar_cliente(text, text, text, text, text, boolean) to service_role;

-- ---------------------------------------------------------------------------
-- "Sentimos sua falta" é promoção: só para quem aceitou novidades.
-- "Recompensa esquecida" é aviso do próprio cartão: continua para todos.
-- ---------------------------------------------------------------------------
create or replace function public.candidatos_automaticos()
returns table (estabelecimento_id uuid, cliente_id uuid, tipo text)
language sql stable security definer set search_path = '' as $$
  select c.estabelecimento_id, c.id, 'sentimos_falta'
  from public.clientes c
  join public.estabelecimentos e on e.id = c.estabelecimento_id and e.ativo
  join public.automacoes a on a.estabelecimento_id = c.estabelecimento_id and a.tipo = 'sentimos_falta'
  where c.anonimizado_em is null
    and c.novidades_aceitas_em is not null
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

-- ---------------------------------------------------------------------------
-- Resumo por cliente: nova coluna no fim (mensagens personalizadas filtram por ela)
-- ---------------------------------------------------------------------------
create or replace view public.clientes_resumo with (security_invoker = true) as
select
  c.id,
  c.estabelecimento_id,
  c.nome,
  c.telefone,
  c.codigo,
  c.plano_tipo,
  c.carimbos_atuais,
  p.carimbos_meta as meta,
  p.recompensa_texto as recompensa,
  c.carimbos_atuais >= p.carimbos_meta as recompensa_disponivel,
  c.recompensa_desde,
  c.criado_em,
  c.ultima_visita_em,
  coalesce(c.ultima_visita_em, c.criado_em) < now() - make_interval(days => e.dias_inatividade) as inativo,
  coalesce(v.total_visitas, 0) as total_visitas,
  coalesce(v.total_gasto_centavos, 0) as total_gasto_centavos,
  c.novidades_aceitas_em is not null as aceita_novidades
from public.clientes c
join public.estabelecimentos e on e.id = c.estabelecimento_id
join public.planos p on p.estabelecimento_id = c.estabelecimento_id and p.tipo = c.plano_tipo
left join lateral (
  select count(*)::int as total_visitas, sum(valor_centavos)::bigint as total_gasto_centavos
  from public.visitas where cliente_id = c.id and desfeita_em is null
) v on true
where c.anonimizado_em is null;

revoke all on public.clientes_resumo from anon, authenticated;
grant select on public.clientes_resumo to authenticated, service_role;
