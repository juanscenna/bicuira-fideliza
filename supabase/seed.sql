-- Dados de teste para desenvolvimento LOCAL (npx supabase db reset).
-- Nunca rode em produção: os logins abaixo têm senhas conhecidas (listadas no README).

-- Logins de teste ------------------------------------------------------------
create or replace function pg_temp.criar_login(p_id uuid, p_email text, p_senha text) returns void
language plpgsql as $$
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated', p_email,
    extensions.crypt(p_senha, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
  );
  insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (p_id::text, p_id, jsonb_build_object('sub', p_id::text, 'email', p_email, 'email_verified', true),
          'email', now(), now(), now());
end $$;

select pg_temp.criar_login('a0000000-0000-4000-8000-000000000001', 'admin@bicuira.test', 'bicuira-admin-local');
select pg_temp.criar_login('a0000000-0000-4000-8000-000000000002', 'dono@restaurante-teste.test', 'restaurante-teste-local');

-- Restaurante Teste ------------------------------------------------------------
-- (os planos padrão e as automações são criados pelo gatilho)
insert into public.estabelecimentos (id, slug, nome, contato_privacidade)
values ('e0000000-0000-4000-8000-000000000001', 'restaurante-teste', 'Restaurante Teste',
        'privacidade@restaurante-teste.test');

insert into public.perfis (user_id, papel, estabelecimento_id) values
  ('a0000000-0000-4000-8000-000000000001', 'super_admin', null),
  ('a0000000-0000-4000-8000-000000000002', 'dono', 'e0000000-0000-4000-8000-000000000001');

-- 20 clientes fictícios com visitas variadas (para as métricas terem o que mostrar) -------
-- Gerados com sorteio fixo (setseed): o resultado é sempre o mesmo.
do $$
declare
  v_estab constant uuid := 'e0000000-0000-4000-8000-000000000001';
  v_dono constant uuid := 'a0000000-0000-4000-8000-000000000002';
  v_minimo int;
  v_nomes text[] := array[
    'Ana Souza', 'Bruno Lima', 'Carla Mendes', 'Diego Rocha', 'Elisa Prado', 'Fábio Nunes', 'Gabriela Reis',
    'Heitor Alves', 'Isadora Costa', 'João Pedro Silva', 'Karina Duarte', 'Lucas Ferreira', 'Marina Teixeira',
    'Nicolas Barros', 'Olívia Martins', 'Paulo Henrique', 'Queila Santos', 'Rafael Moura', 'Sofia Cardoso', 'Tiago Ramos'
  ];
  v_planos text[] := array[
    'morador','morador','turista','morador','turista','morador','morador','turista','morador','turista',
    'morador','morador','turista','morador','morador','turista','morador','turista','morador','turista'
  ];
  -- quantas visitas e há quantos dias o cliente se cadastrou
  v_visitas int[] := array[14, 9, 5, 1, 2, 11, 0, 6, 3, 1, 21, 7, 4, 1, 10, 3, 2, 0, 8, 5];
  v_dias int[] := array[120, 80, 20, 45, 6, 95, 2, 30, 60, 3, 150, 50, 12, 70, 40, 9, 35, 1, 100, 15];
  v_cliente uuid;
  v_meta int;
  v_saldo int;
  v_ciclo int;
  v_quando timestamptz;
  v_valor int;
  v_gera boolean;
  v_visita uuid;
  v_ultima timestamptz;
  v_completou_em timestamptz;
begin
  perform setseed(0.42);
  select gasto_minimo_centavos into v_minimo from public.estabelecimentos where id = v_estab;

  for i in 1..20 loop
    select carimbos_meta into v_meta from public.planos where estabelecimento_id = v_estab and tipo = v_planos[i];
    insert into public.clientes (estabelecimento_id, nome, telefone, codigo, plano_tipo, criado_em)
    values (v_estab, v_nomes[i], '+55489' || lpad((88000000 + i * 1371)::text, 8, '0'),
            public.gerar_codigo_cartao(v_estab), v_planos[i], now() - make_interval(days => v_dias[i]))
    returning id into v_cliente;
    insert into public.passes (estabelecimento_id, cliente_id) values (v_estab, v_cliente);
    insert into public.consentimentos (estabelecimento_id, cliente_id, versao_texto, aceito_em)
    values (v_estab, v_cliente, 1, now() - make_interval(days => v_dias[i]));

    v_saldo := 0; v_ciclo := 1; v_ultima := null; v_completou_em := null;
    for j in 1..v_visitas[i] loop
      -- visitas espalhadas entre o cadastro e hoje, em horário de almoço/jantar
      v_quando := now() - make_interval(days => v_dias[i]) + make_interval(days => ((j - 1) * v_dias[i]) / greatest(v_visitas[i], 1));
      v_quando := (date_trunc('day', v_quando at time zone 'America/Sao_Paulo')
                   + case when random() < 0.5 then interval '11 hours 30 minutes' else interval '19 hours' end
                   + make_interval(mins => (floor(random() * 150))::int)) at time zone 'America/Sao_Paulo';
      if v_quando > now() then v_quando := now() - interval '1 hour'; end if;
      v_valor := (800 + floor(random() * 9000))::int;   -- R$ 8,00 a R$ 98,00
      v_gera := v_valor >= v_minimo and v_saldo < v_meta;

      insert into public.visitas (estabelecimento_id, cliente_id, valor_centavos, descricao, gerou_carimbo, ciclo, registrado_por, criado_em)
      values (v_estab, v_cliente, v_valor,
              (array['Almoço', 'Jantar', 'Prato do dia', 'Petiscos', null, 'Café e sobremesa', null])[1 + floor(random() * 7)::int],
              v_gera, v_ciclo, v_dono, v_quando)
      returning id into v_visita;
      v_ultima := v_quando;

      if v_gera then
        v_saldo := v_saldo + 1;
        insert into public.eventos_carimbo (estabelecimento_id, cliente_id, tipo, delta, saldo_apos, ciclo, visita_id, criado_por, criado_em)
        values (v_estab, v_cliente, 'visita', 1, v_saldo, v_ciclo, v_visita, v_dono, v_quando);
        if v_saldo = v_meta then v_completou_em := v_quando; end if;
      end if;

      -- quem completa costuma resgatar na visita seguinte (menos os 2 últimos clientes "esquecidos")
      if v_saldo >= v_meta and j < v_visitas[i] and i not in (11, 19) then
        insert into public.eventos_carimbo (estabelecimento_id, cliente_id, tipo, delta, saldo_apos, ciclo, dados, criado_por, criado_em)
        values (v_estab, v_cliente, 'resgate', -v_saldo, 0, v_ciclo,
                jsonb_build_object('recompensa', (select recompensa_texto from public.planos where estabelecimento_id = v_estab and tipo = v_planos[i]), 'meta', v_meta),
                v_dono, v_quando + interval '1 minute');
        v_saldo := 0; v_ciclo := v_ciclo + 1; v_completou_em := null;
      end if;
    end loop;

    update public.clientes set
      carimbos_atuais = v_saldo, ciclo = v_ciclo, ultima_visita_em = v_ultima,
      recompensa_desde = case when v_saldo >= v_meta then v_completou_em end
    where id = v_cliente;
  end loop;
end $$;
