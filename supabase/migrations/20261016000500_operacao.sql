-- Operação do dono: visitas, carimbos, resgate, troca de plano, edição e "desfazer".
-- Todas as funções:
--   • conferem que o cliente é do estabelecimento do login (meu_estabelecimento())
--   • travam a linha do cliente (FOR UPDATE) → dois cliques não geram carimbo duplicado
--   • gravam o evento imutável de carimbo, a auditoria e aumentam a versão do cartão (Wallet)

-- ---------------------------------------------------------------------------
-- Auxiliares internas
-- ---------------------------------------------------------------------------
create function public._erro(p_codigo text, p_mensagem text) returns void
language plpgsql as $$
begin
  -- o código vem antes de ":" para o app mostrar a mensagem certa
  raise exception '%: %', p_codigo, p_mensagem using errcode = 'P0001';
end $$;

-- Cliente travado para alteração, conferindo o estabelecimento do login e se está ativo
create function public._cliente_para_operar(p_cliente uuid) returns public.clientes
language plpgsql security definer set search_path = '' as $$
declare
  v_cliente public.clientes;
  v_estab uuid := public.meu_estabelecimento();
begin
  if v_estab is null then
    perform public._erro('sem_permissao', 'Login sem estabelecimento');
  end if;
  if not exists (select 1 from public.estabelecimentos where id = v_estab and ativo) then
    perform public._erro('inativo', 'Estabelecimento desativado');
  end if;
  select * into v_cliente from public.clientes
  where id = p_cliente and estabelecimento_id = v_estab
  for update;
  if not found or v_cliente.anonimizado_em is not null then
    perform public._erro('nao_encontrado', 'Cliente não encontrado');
  end if;
  return v_cliente;
end $$;

create function public._meta_do_plano(p_estab uuid, p_plano text) returns int
language sql stable security definer set search_path = '' as $$
  select carimbos_meta from public.planos where estabelecimento_id = p_estab and tipo = p_plano
$$;

-- Atualiza o saldo do cliente, a data da recompensa e a versão do cartão no Wallet
create function public._aplicar_saldo(p_cliente public.clientes, p_novo_saldo int, p_meta int, p_novo_ciclo int default null)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.clientes set
    carimbos_atuais = p_novo_saldo,
    ciclo = coalesce(p_novo_ciclo, ciclo),
    recompensa_desde = case
      when p_novo_saldo >= p_meta then coalesce(recompensa_desde, now())
      else null
    end
  where id = p_cliente.id;
  update public.passes set versao = versao + 1, atualizado_em = now() where cliente_id = p_cliente.id;
end $$;

create function public._auditar(
  p_estab uuid, p_acao text, p_alvo_tipo text, p_alvo_id text, p_antes jsonb, p_depois jsonb,
  p_user_agent text, p_ip_hash text
) returns void
language sql security definer set search_path = '' as $$
  insert into public.auditoria (estabelecimento_id, user_id, acao, alvo_tipo, alvo_id, antes, depois, user_agent, ip_hash)
  values (p_estab, (select auth.uid()), p_acao, p_alvo_tipo, p_alvo_id, p_antes, p_depois, left(p_user_agent, 300), p_ip_hash)
$$;

-- Resultado padrão: estado do cartão depois da operação
create function public._estado(p_cliente uuid, p_extra jsonb default '{}') returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'cliente_id', c.id,
    'nome', c.nome,
    'carimbos', c.carimbos_atuais,
    'meta', p.carimbos_meta,
    'recompensa', p.recompensa_texto,
    'recompensa_disponivel', c.carimbos_atuais >= p.carimbos_meta,
    'plano', c.plano_tipo,
    'token', c.token_cartao
  ) || p_extra
  from public.clientes c
  join public.planos p on p.estabelecimento_id = c.estabelecimento_id and p.tipo = c.plano_tipo
  where c.id = p_cliente
$$;

-- ---------------------------------------------------------------------------
-- Registrar visita
-- ---------------------------------------------------------------------------
create function public.registrar_visita(
  p_cliente uuid, p_valor_centavos int, p_descricao text, p_user_agent text default null, p_ip_hash text default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  c public.clientes := public._cliente_para_operar(p_cliente);
  v_meta int := public._meta_do_plano(c.estabelecimento_id, c.plano_tipo);
  v_minimo int := (select gasto_minimo_centavos from public.estabelecimentos where id = c.estabelecimento_id);
  v_motivo text := null;
  v_gera boolean;
  v_visita uuid;
begin
  if p_valor_centavos is null or p_valor_centavos < 0 or p_valor_centavos > 100000000 then
    perform public._erro('valor_invalido', 'Valor inválido');
  end if;

  if p_valor_centavos < v_minimo then
    v_motivo := 'abaixo_minimo';
  elsif c.carimbos_atuais >= v_meta then
    v_motivo := 'cartao_cheio';
  end if;
  v_gera := v_motivo is null;

  insert into public.visitas (estabelecimento_id, cliente_id, valor_centavos, descricao, gerou_carimbo, ciclo, registrado_por)
  values (c.estabelecimento_id, c.id, p_valor_centavos, nullif(btrim(p_descricao), ''), v_gera, c.ciclo, (select auth.uid()))
  returning id into v_visita;

  update public.clientes set ultima_visita_em = now() where id = c.id;

  if v_gera then
    insert into public.eventos_carimbo (estabelecimento_id, cliente_id, tipo, delta, saldo_apos, ciclo, visita_id, criado_por)
    values (c.estabelecimento_id, c.id, 'visita', 1, c.carimbos_atuais + 1, c.ciclo, v_visita, (select auth.uid()));
    perform public._aplicar_saldo(c, c.carimbos_atuais + 1, v_meta);
  end if;

  perform public._auditar(c.estabelecimento_id, 'visita.registrar', 'visita', v_visita::text, null,
    jsonb_build_object('cliente', c.codigo, 'valor_centavos', p_valor_centavos, 'gerou_carimbo', v_gera),
    p_user_agent, p_ip_hash);

  return public._estado(c.id, jsonb_build_object(
    'visita_id', v_visita,
    'gerou_carimbo', v_gera,
    'motivo', v_motivo,
    'completou', v_gera and c.carimbos_atuais + 1 = v_meta,
    'falta_um', v_gera and c.carimbos_atuais + 1 = v_meta - 1
  ));
end $$;

-- ---------------------------------------------------------------------------
-- +1 / −1 carimbo manual
-- ---------------------------------------------------------------------------
create function public.ajustar_carimbos(
  p_cliente uuid, p_delta int, p_motivo text default null, p_user_agent text default null, p_ip_hash text default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  c public.clientes := public._cliente_para_operar(p_cliente);
  v_meta int := public._meta_do_plano(c.estabelecimento_id, c.plano_tipo);
  v_novo int := c.carimbos_atuais + p_delta;
  v_evento uuid;
begin
  if p_delta not in (1, -1) then
    perform public._erro('delta_invalido', 'Ajuste deve ser +1 ou -1');
  end if;
  if v_novo < 0 then
    perform public._erro('limite', 'O cartão já está sem carimbos');
  end if;
  if v_novo > v_meta then
    perform public._erro('limite', 'O cartão já está completo');
  end if;

  insert into public.eventos_carimbo (estabelecimento_id, cliente_id, tipo, delta, saldo_apos, ciclo, motivo, criado_por)
  values (c.estabelecimento_id, c.id, case when p_delta > 0 then 'manual_mais' else 'manual_menos' end,
          p_delta, v_novo, c.ciclo, nullif(btrim(p_motivo), ''), (select auth.uid()))
  returning id into v_evento;
  perform public._aplicar_saldo(c, v_novo, v_meta);

  perform public._auditar(c.estabelecimento_id, case when p_delta > 0 then 'carimbo.mais' else 'carimbo.menos' end,
    'cliente', c.id::text, jsonb_build_object('carimbos', c.carimbos_atuais),
    jsonb_build_object('carimbos', v_novo, 'motivo', p_motivo), p_user_agent, p_ip_hash);

  return public._estado(c.id, jsonb_build_object(
    'evento_id', v_evento,
    'completou', p_delta > 0 and v_novo = v_meta,
    'falta_um', p_delta > 0 and v_novo = v_meta - 1
  ));
end $$;

-- ---------------------------------------------------------------------------
-- Resgatar recompensa (só com cartão cheio): volta a 0 e começa novo ciclo
-- ---------------------------------------------------------------------------
create function public.resgatar(p_cliente uuid, p_user_agent text default null, p_ip_hash text default null)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  c public.clientes := public._cliente_para_operar(p_cliente);
  v_meta int := public._meta_do_plano(c.estabelecimento_id, c.plano_tipo);
  v_recompensa text := (select recompensa_texto from public.planos where estabelecimento_id = c.estabelecimento_id and tipo = c.plano_tipo);
begin
  if c.carimbos_atuais < v_meta then
    perform public._erro('incompleto', 'A recompensa só pode ser resgatada com o cartão completo');
  end if;

  insert into public.eventos_carimbo (estabelecimento_id, cliente_id, tipo, delta, saldo_apos, ciclo, dados, criado_por)
  values (c.estabelecimento_id, c.id, 'resgate', -c.carimbos_atuais, 0, c.ciclo,
          jsonb_build_object('recompensa', v_recompensa, 'meta', v_meta), (select auth.uid()));
  perform public._aplicar_saldo(c, 0, v_meta, c.ciclo + 1);

  perform public._auditar(c.estabelecimento_id, 'recompensa.resgatar', 'cliente', c.id::text,
    jsonb_build_object('carimbos', c.carimbos_atuais, 'ciclo', c.ciclo),
    jsonb_build_object('carimbos', 0, 'ciclo', c.ciclo + 1, 'recompensa', v_recompensa), p_user_agent, p_ip_hash);

  return public._estado(c.id, jsonb_build_object('recompensa_entregue', v_recompensa));
end $$;

-- ---------------------------------------------------------------------------
-- Trocar plano: mantém carimbos, limitados ao máximo do novo plano
-- ---------------------------------------------------------------------------
create function public.trocar_plano(p_cliente uuid, p_plano text, p_user_agent text default null, p_ip_hash text default null)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  c public.clientes := public._cliente_para_operar(p_cliente);
  v_meta_antiga int := public._meta_do_plano(c.estabelecimento_id, c.plano_tipo);
  v_meta int;
  v_novo int;
begin
  if p_plano = c.plano_tipo then
    perform public._erro('mesmo_plano', 'O cliente já está nesse plano');
  end if;
  select carimbos_meta into v_meta from public.planos
  where estabelecimento_id = c.estabelecimento_id and tipo = p_plano and ativo;
  if v_meta is null then
    perform public._erro('plano_invalido', 'Plano não disponível');
  end if;
  v_novo := least(c.carimbos_atuais, v_meta);

  update public.clientes set plano_tipo = p_plano where id = c.id;
  insert into public.eventos_carimbo (estabelecimento_id, cliente_id, tipo, delta, saldo_apos, ciclo, dados, criado_por)
  values (c.estabelecimento_id, c.id, 'troca_plano', v_novo - c.carimbos_atuais, v_novo, c.ciclo,
          jsonb_build_object('de', c.plano_tipo, 'para', p_plano), (select auth.uid()));
  perform public._aplicar_saldo(c, v_novo, v_meta);

  perform public._auditar(c.estabelecimento_id, 'cliente.trocar_plano', 'cliente', c.id::text,
    jsonb_build_object('plano', c.plano_tipo, 'carimbos', c.carimbos_atuais),
    jsonb_build_object('plano', p_plano, 'carimbos', v_novo), p_user_agent, p_ip_hash);

  return public._estado(c.id, jsonb_build_object('completou', v_novo >= v_meta and c.carimbos_atuais < v_meta_antiga));
end $$;

-- ---------------------------------------------------------------------------
-- Editar visita (corrigir valor/descrição). Ajusta o carimbo se cruzar o mínimo,
-- exceto se já houve resgate depois da visita (aí só corrige o valor e avisa).
-- ---------------------------------------------------------------------------
create function public.editar_visita(
  p_visita uuid, p_valor_centavos int, p_descricao text, p_user_agent text default null, p_ip_hash text default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v public.visitas;
  c public.clientes;
  v_meta int;
  v_minimo int;
  v_atinge boolean;
  v_gerou boolean;
  v_delta int := 0;
  v_aviso text := null;
begin
  select * into v from public.visitas where id = p_visita and estabelecimento_id = public.meu_estabelecimento();
  if not found or v.desfeita_em is not null then
    perform public._erro('nao_encontrado', 'Visita não encontrada');
  end if;
  c := public._cliente_para_operar(v.cliente_id);
  select * into v from public.visitas where id = p_visita for update;
  if p_valor_centavos is null or p_valor_centavos < 0 or p_valor_centavos > 100000000 then
    perform public._erro('valor_invalido', 'Valor inválido');
  end if;

  v_meta := public._meta_do_plano(c.estabelecimento_id, c.plano_tipo);
  v_minimo := (select gasto_minimo_centavos from public.estabelecimentos where id = c.estabelecimento_id);
  v_atinge := p_valor_centavos >= v_minimo;
  v_gerou := v.gerou_carimbo;

  if v_atinge <> v.gerou_carimbo then
    if v.ciclo < c.ciclo then
      v_aviso := 'resgate_posterior';            -- já houve resgate depois: só corrige o valor
    elsif v_atinge and c.carimbos_atuais >= v_meta then
      v_aviso := 'cartao_cheio';                 -- passaria do máximo: não ganha carimbo
    elsif v_atinge then
      v_delta := 1;
      v_gerou := true;
    elsif c.carimbos_atuais > 0 then
      v_delta := -1;
      v_gerou := false;
    else
      v_gerou := false;                          -- carimbo já tinha sido removido manualmente
    end if;
  end if;

  update public.visitas set
    valor_centavos = p_valor_centavos,
    descricao = nullif(btrim(p_descricao), ''),
    gerou_carimbo = v_gerou,
    editado_em = now()
  where id = v.id;

  insert into public.eventos_carimbo (estabelecimento_id, cliente_id, tipo, delta, saldo_apos, ciclo, visita_id, dados, criado_por)
  values (c.estabelecimento_id, c.id, 'ajuste_edicao', v_delta, c.carimbos_atuais + v_delta, c.ciclo, v.id,
          jsonb_build_object('valor_antigo', v.valor_centavos, 'valor_novo', p_valor_centavos,
                             'descricao_antiga', v.descricao, 'descricao_nova', nullif(btrim(p_descricao), ''),
                             'aviso', v_aviso),
          (select auth.uid()));
  if v_delta <> 0 then
    perform public._aplicar_saldo(c, c.carimbos_atuais + v_delta, v_meta);
  end if;

  perform public._auditar(c.estabelecimento_id, 'visita.editar', 'visita', v.id::text,
    jsonb_build_object('valor_centavos', v.valor_centavos, 'descricao', v.descricao, 'gerou_carimbo', v.gerou_carimbo),
    jsonb_build_object('valor_centavos', p_valor_centavos, 'descricao', p_descricao, 'gerou_carimbo', v_gerou),
    p_user_agent, p_ip_hash);

  return public._estado(c.id, jsonb_build_object('delta', v_delta, 'aviso', v_aviso));
end $$;

-- ---------------------------------------------------------------------------
-- Desfazer (logo após um engano): visita registrada ou +1/−1 manual.
-- Vale por 10 minutos e só se não houve resgate depois. Gera evento compensatório.
-- ---------------------------------------------------------------------------
create function public.desfazer_visita(p_visita uuid, p_user_agent text default null, p_ip_hash text default null)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v public.visitas;
  c public.clientes;
  v_meta int;
  v_evento uuid;
begin
  select * into v from public.visitas where id = p_visita and estabelecimento_id = public.meu_estabelecimento();
  if not found or v.desfeita_em is not null then
    perform public._erro('nao_encontrado', 'Visita não encontrada');
  end if;
  c := public._cliente_para_operar(v.cliente_id);
  if v.criado_em < now() - interval '10 minutes' or v.ciclo < c.ciclo then
    perform public._erro('expirado', 'Não dá mais para desfazer esta visita');
  end if;
  v_meta := public._meta_do_plano(c.estabelecimento_id, c.plano_tipo);

  update public.visitas set desfeita_em = now() where id = v.id;
  update public.clientes set ultima_visita_em = (
    select max(criado_em) from public.visitas where cliente_id = c.id and desfeita_em is null
  ) where id = c.id;

  if v.gerou_carimbo and c.carimbos_atuais > 0 then
    select id into v_evento from public.eventos_carimbo where visita_id = v.id and tipo = 'visita';
    insert into public.eventos_carimbo (estabelecimento_id, cliente_id, tipo, delta, saldo_apos, ciclo, visita_id, evento_desfeito_id, criado_por)
    values (c.estabelecimento_id, c.id, 'desfazer', -1, c.carimbos_atuais - 1, c.ciclo, v.id, v_evento, (select auth.uid()));
    perform public._aplicar_saldo(c, c.carimbos_atuais - 1, v_meta);
  end if;

  perform public._auditar(c.estabelecimento_id, 'visita.desfazer', 'visita', v.id::text,
    jsonb_build_object('valor_centavos', v.valor_centavos, 'gerou_carimbo', v.gerou_carimbo), null, p_user_agent, p_ip_hash);
  return public._estado(c.id);
end $$;

create function public.desfazer_ajuste(p_evento uuid, p_user_agent text default null, p_ip_hash text default null)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  e public.eventos_carimbo;
  c public.clientes;
  v_meta int;
  v_novo int;
begin
  select * into e from public.eventos_carimbo
  where id = p_evento and estabelecimento_id = public.meu_estabelecimento() and tipo in ('manual_mais', 'manual_menos');
  if not found then
    perform public._erro('nao_encontrado', 'Ajuste não encontrado');
  end if;
  c := public._cliente_para_operar(e.cliente_id);
  if e.criado_em < now() - interval '10 minutes' or e.ciclo < c.ciclo
     or exists (select 1 from public.eventos_carimbo where evento_desfeito_id = e.id) then
    perform public._erro('expirado', 'Não dá mais para desfazer este ajuste');
  end if;
  v_meta := public._meta_do_plano(c.estabelecimento_id, c.plano_tipo);
  v_novo := c.carimbos_atuais - e.delta;
  if v_novo < 0 or v_novo > v_meta then
    perform public._erro('limite', 'Não dá para desfazer: o saldo ficaria fora do limite');
  end if;

  insert into public.eventos_carimbo (estabelecimento_id, cliente_id, tipo, delta, saldo_apos, ciclo, evento_desfeito_id, criado_por)
  values (c.estabelecimento_id, c.id, 'desfazer', -e.delta, v_novo, c.ciclo, e.id, (select auth.uid()));
  perform public._aplicar_saldo(c, v_novo, v_meta);

  perform public._auditar(c.estabelecimento_id, 'carimbo.desfazer', 'cliente', c.id::text,
    jsonb_build_object('carimbos', c.carimbos_atuais), jsonb_build_object('carimbos', v_novo), p_user_agent, p_ip_hash);
  return public._estado(c.id);
end $$;

-- ---------------------------------------------------------------------------
-- Resumo por cliente para a lista do painel (o RLS das tabelas vale: security_invoker)
-- ---------------------------------------------------------------------------
create view public.clientes_resumo with (security_invoker = true) as
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
  coalesce(v.total_gasto_centavos, 0) as total_gasto_centavos
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

-- ---------------------------------------------------------------------------
-- Permissões: só usuários logados chamam (e as funções conferem o estabelecimento)
-- ---------------------------------------------------------------------------
do $$
declare f text;
begin
  foreach f in array array[
    'public._erro(text, text)',
    'public._cliente_para_operar(uuid)',
    'public._meta_do_plano(uuid, text)',
    'public._aplicar_saldo(public.clientes, int, int, int)',
    'public._auditar(uuid, text, text, text, jsonb, jsonb, text, text)',
    'public._estado(uuid, jsonb)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
  end loop;

  foreach f in array array[
    'public.registrar_visita(uuid, int, text, text, text)',
    'public.ajustar_carimbos(uuid, int, text, text, text)',
    'public.resgatar(uuid, text, text)',
    'public.trocar_plano(uuid, text, text, text)',
    'public.editar_visita(uuid, int, text, text, text)',
    'public.desfazer_visita(uuid, text, text)',
    'public.desfazer_ajuste(uuid, text, text)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
