-- Cadastro público de clientes e limite de requisições.
-- Chamadas somente pelo servidor (service_role); o público nunca acessa direto.

-- ---------------------------------------------------------------------------
-- Limite de requisições por janela de tempo. Devolve true se ainda pode.
-- ---------------------------------------------------------------------------
create function public.consumir_limite(p_chave text, p_maximo int, p_janela_segundos int)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_inicio timestamptz := to_timestamp(floor(extract(epoch from now()) / p_janela_segundos) * p_janela_segundos);
  v_contagem int;
begin
  insert into public.limites_requisicao as l (chave, janela_inicio, contagem)
  values (p_chave, v_inicio, 1)
  on conflict (chave, janela_inicio) do update set contagem = l.contagem + 1
  returning contagem into v_contagem;

  -- limpeza ocasional de janelas antigas
  if random() < 0.01 then
    delete from public.limites_requisicao where janela_inicio < now() - interval '1 day';
  end if;

  return v_contagem <= p_maximo;
end $$;

-- ---------------------------------------------------------------------------
-- Código do cartão: 1 letra (sem O, I, L) + 4 números, único no estabelecimento
-- ---------------------------------------------------------------------------
create function public.gerar_codigo_cartao(p_estabelecimento uuid)
returns text
language plpgsql set search_path = '' as $$
declare
  v_letras constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ';
  v_codigo text;
begin
  for i in 1..50 loop
    v_codigo := substr(v_letras, 1 + floor(random() * length(v_letras))::int, 1)
                || lpad(floor(random() * 10000)::int::text, 4, '0');
    if not exists (
      select 1 from public.clientes where estabelecimento_id = p_estabelecimento and codigo = v_codigo
    ) then
      return v_codigo;
    end if;
  end loop;
  raise exception 'Não foi possível gerar um código livre';
end $$;

-- ---------------------------------------------------------------------------
-- Cadastro: cria o cliente ou devolve o cartão já existente (mesmo telefone).
-- Resultado: { status: 'criado' | 'existente' | 'inativo' | 'nao_encontrado' | 'plano_invalido', token, codigo }
-- Nunca devolve dados do cadastro existente além do token do próprio cartão.
-- ---------------------------------------------------------------------------
create function public.cadastrar_cliente(
  p_slug text,
  p_nome text,
  p_telefone text,
  p_plano text,
  p_ip_hash text
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
    insert into public.clientes (estabelecimento_id, nome, telefone, codigo, plano_tipo)
    values (v_estab.id, btrim(p_nome), p_telefone, public.gerar_codigo_cartao(v_estab.id), v_plano)
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
  insert into public.consentimentos (estabelecimento_id, cliente_id, versao_texto, ip_hash)
  values (v_estab.id, v_cliente.id, v_estab.versao_politica, p_ip_hash);
  insert into public.auditoria (estabelecimento_id, acao, alvo_tipo, alvo_id, depois, ip_hash)
  values (v_estab.id, 'cliente.cadastro', 'cliente', v_cliente.id::text,
          jsonb_build_object('codigo', v_cliente.codigo, 'plano', v_plano), p_ip_hash);

  return jsonb_build_object('status', 'criado', 'token', v_cliente.token_cartao, 'codigo', v_cliente.codigo);
end $$;

revoke all on function public.consumir_limite(text, int, int) from public, anon, authenticated;
revoke all on function public.gerar_codigo_cartao(uuid) from public, anon, authenticated;
revoke all on function public.cadastrar_cliente(text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.consumir_limite(text, int, int) to service_role;
grant execute on function public.gerar_codigo_cartao(uuid) to service_role;
grant execute on function public.cadastrar_cliente(text, text, text, text, text) to service_role;
