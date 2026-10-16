-- Bicuíra Fideliza — estrutura completa do banco (gerado por scripts/gerar-sql-producao.mjs).
-- Cole tudo no Supabase → SQL Editor → Run, UMA vez, num projeto novo.
-- Não contém dados de teste nem logins.

-- ===== 20261016000100_estrutura.sql =====
-- Bicuíra Fideliza — estrutura base (tabelas, relações e restrições)
-- Convenções:
--   • dinheiro em centavos inteiros (int)
--   • datas em timestamptz (UTC no banco, exibidas em America/Sao_Paulo)
--   • toda tabela de dados de estabelecimento carrega estabelecimento_id
--   • chaves compostas (estabelecimento_id, id) impedem ligar registros de estabelecimentos diferentes

-- ---------------------------------------------------------------------------
-- Estabelecimentos
-- ---------------------------------------------------------------------------
create table public.estabelecimentos (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 60)
    -- caminhos usados pelo próprio sistema não podem virar página de estabelecimento
    check (slug not in ('painel', 'admin', 'entrar', 'sair', 'api', 'privacidade',
                        'cartao', 'static', 'public', 'auth', 'favicon-ico', 'robots-txt',
                        'sitemap-xml', 'manifest', 'bicuira', 'fideliza')),
  nome text not null check (char_length(btrim(nome)) between 2 and 80),
  logo_path text,
  cor_primaria text not null default '#3F3F46' check (cor_primaria ~ '^#[0-9A-Fa-f]{6}$'),
  cor_secundaria text not null default '#F4F4F5' check (cor_secundaria ~ '^#[0-9A-Fa-f]{6}$'),
  gasto_minimo_centavos int not null default 1500 check (gasto_minimo_centavos >= 0),
  dias_inatividade int not null default 30 check (dias_inatividade between 1 and 365),
  max_personalizadas_semana int not null default 2 check (max_personalizadas_semana between 0 and 14),
  contato_privacidade text,             -- e-mail/telefone para pedidos LGPD (aparece na política)
  versao_politica int not null default 1 check (versao_politica >= 1),
  ativo boolean not null default true,
  -- cobrança: apenas informativo no piloto
  cobranca_plano text,
  cobranca_status text,
  cobranca_vencimento date,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Planos (morador / turista)
-- ---------------------------------------------------------------------------
create table public.planos (
  id uuid primary key default gen_random_uuid(),
  estabelecimento_id uuid not null references public.estabelecimentos (id) on delete cascade,
  tipo text not null check (tipo in ('morador', 'turista')),
  ativo boolean not null default true,
  carimbos_meta int not null check (carimbos_meta between 1 and 30),
  recompensa_texto text not null check (char_length(btrim(recompensa_texto)) between 2 and 60),
  unique (estabelecimento_id, tipo)
);

-- ---------------------------------------------------------------------------
-- Perfis de acesso (vinculam um login do Supabase Auth a um papel)
-- Hoje: um dono por estabelecimento. O modelo já aceita vários.
-- ---------------------------------------------------------------------------
create table public.perfis (
  user_id uuid primary key references auth.users (id) on delete cascade,
  papel text not null check (papel in ('super_admin', 'dono')),
  estabelecimento_id uuid references public.estabelecimentos (id) on delete cascade,
  criado_em timestamptz not null default now(),
  check (
    (papel = 'super_admin' and estabelecimento_id is null)
    or (papel = 'dono' and estabelecimento_id is not null)
  )
);
create index perfis_estabelecimento_idx on public.perfis (estabelecimento_id);

-- ---------------------------------------------------------------------------
-- Clientes
-- ---------------------------------------------------------------------------
create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  estabelecimento_id uuid not null references public.estabelecimentos (id) on delete cascade,
  nome text not null,
  telefone text check (telefone ~ '^\+55[1-9][0-9]9[0-9]{8}$'),   -- celular brasileiro E.164
  -- 1 letra (sem O, I, L) + 4 números
  codigo text not null check (codigo ~ '^[A-HJKMNP-Z][0-9]{4}$'),
  plano_tipo text not null check (plano_tipo in ('morador', 'turista')),
  carimbos_atuais int not null default 0 check (carimbos_atuais >= 0),  -- cache do saldo do registro de eventos
  ciclo int not null default 1 check (ciclo >= 1),                      -- aumenta a cada resgate
  recompensa_desde timestamptz,                                        -- quando o cartão completou
  ultima_visita_em timestamptz,
  token_cartao text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  anonimizado_em timestamptz,
  criado_em timestamptz not null default now(),
  unique (estabelecimento_id, id),
  unique (estabelecimento_id, telefone),
  unique (estabelecimento_id, codigo),
  check (telefone is not null or anonimizado_em is not null)
);
create index clientes_nome_idx on public.clientes (estabelecimento_id, lower(nome));
create index clientes_ultima_visita_idx on public.clientes (estabelecimento_id, ultima_visita_em);

-- ---------------------------------------------------------------------------
-- Visitas
-- ---------------------------------------------------------------------------
create table public.visitas (
  id uuid primary key default gen_random_uuid(),
  estabelecimento_id uuid not null,
  cliente_id uuid not null,
  valor_centavos int not null check (valor_centavos between 0 and 100000000),
  descricao text check (char_length(descricao) <= 200),
  gerou_carimbo boolean not null default false,
  ciclo int not null,
  registrado_por uuid references auth.users (id) on delete set null,
  criado_em timestamptz not null default now(),
  editado_em timestamptz,
  desfeita_em timestamptz,    -- "Desfazer" logo após registrar; visitas desfeitas não contam nas métricas
  unique (estabelecimento_id, id),
  foreign key (estabelecimento_id, cliente_id)
    references public.clientes (estabelecimento_id, id) on delete cascade
);
create index visitas_cliente_idx on public.visitas (cliente_id, criado_em);
create index visitas_estabelecimento_idx on public.visitas (estabelecimento_id, criado_em);

-- ---------------------------------------------------------------------------
-- Eventos de carimbo — registro IMUTÁVEL (só inserção)
-- delta: +1, -1, -N (resgate / ajustes) ; saldo_apos: carimbos depois do evento
-- ---------------------------------------------------------------------------
create table public.eventos_carimbo (
  id uuid primary key default gen_random_uuid(),
  estabelecimento_id uuid not null,
  cliente_id uuid not null,
  tipo text not null check (tipo in (
    'visita',          -- carimbo gerado por visita
    'manual_mais',     -- +1 manual
    'manual_menos',    -- -1 manual
    'resgate',         -- recompensa entregue, cartão volta a 0
    'troca_plano',     -- carimbos limitados ao máximo do novo plano
    'ajuste_edicao',   -- edição de visita ganhou/perdeu carimbo
    'desfazer'         -- compensa um evento anterior
  )),
  delta int not null,
  saldo_apos int not null check (saldo_apos >= 0),
  ciclo int not null,
  visita_id uuid references public.visitas (id) on delete set null,
  evento_desfeito_id uuid references public.eventos_carimbo (id),
  motivo text check (char_length(motivo) <= 200),
  dados jsonb not null default '{}'::jsonb,
  criado_por uuid references auth.users (id) on delete set null,
  criado_em timestamptz not null default now(),
  foreign key (estabelecimento_id, cliente_id)
    references public.clientes (estabelecimento_id, id) on delete cascade
);
create index eventos_carimbo_cliente_idx on public.eventos_carimbo (cliente_id, criado_em);
create index eventos_carimbo_estab_tipo_idx on public.eventos_carimbo (estabelecimento_id, tipo, criado_em);

-- ---------------------------------------------------------------------------
-- Consentimentos (LGPD)
-- ---------------------------------------------------------------------------
create table public.consentimentos (
  id uuid primary key default gen_random_uuid(),
  estabelecimento_id uuid not null,
  cliente_id uuid not null,
  versao_texto int not null,
  aceito_em timestamptz not null default now(),
  ip_hash text,
  foreign key (estabelecimento_id, cliente_id)
    references public.clientes (estabelecimento_id, id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- Wallet
-- ---------------------------------------------------------------------------
create table public.passes (
  cliente_id uuid primary key,
  estabelecimento_id uuid not null,
  serial text not null unique default encode(extensions.gen_random_bytes(16), 'hex'),
  apple_auth_token text not null default encode(extensions.gen_random_bytes(24), 'hex'),
  google_object_id text unique,
  versao int not null default 1,
  mensagem_atual text,            -- última notificação (mostrada no cartão web e no Wallet)
  mensagem_em timestamptz,
  atualizado_em timestamptz not null default now(),
  foreign key (estabelecimento_id, cliente_id)
    references public.clientes (estabelecimento_id, id) on delete cascade
);

create table public.dispositivos_apple (
  device_library_id text primary key,
  push_token text not null,
  criado_em timestamptz not null default now()
);

create table public.registros_apple (
  device_library_id text not null references public.dispositivos_apple (device_library_id) on delete cascade,
  serial text not null references public.passes (serial) on delete cascade,
  criado_em timestamptz not null default now(),
  primary key (device_library_id, serial)
);

-- ---------------------------------------------------------------------------
-- Notificações
-- ---------------------------------------------------------------------------
create table public.automacoes (
  estabelecimento_id uuid not null references public.estabelecimentos (id) on delete cascade,
  tipo text not null check (tipo in ('falta_pouco', 'recompensa_disponivel', 'sentimos_falta', 'recompensa_esquecida')),
  ativa_morador boolean not null default true,
  ativa_turista boolean not null default true,
  primary key (estabelecimento_id, tipo)
);

create table public.campanhas (
  id uuid primary key default gen_random_uuid(),
  estabelecimento_id uuid not null references public.estabelecimentos (id) on delete cascade,
  texto text not null,
  publico jsonb not null,           -- { "tipo": "todos" | "moradores" | ... , "clientes": [...] }
  agendada_para timestamptz,
  status text not null default 'agendada' check (status in ('agendada', 'enviando', 'enviada', 'cancelada')),
  total_alvo int,
  total_enviados int,
  total_pulados int,
  criada_por uuid references auth.users (id) on delete set null,
  criado_em timestamptz not null default now(),
  unique (estabelecimento_id, id)
);

create table public.envios (
  id uuid primary key default gen_random_uuid(),
  estabelecimento_id uuid not null,
  cliente_id uuid not null,
  campanha_id uuid,
  automacao_tipo text,
  origem text not null check (origem in ('personalizada', 'automatica')),
  texto text not null,
  status text not null check (status in ('enviado', 'pulado', 'falhou')),   -- nunca "entregue"
  motivo text,
  canais text[] not null default '{}',
  criado_em timestamptz not null default now(),
  foreign key (estabelecimento_id, cliente_id)
    references public.clientes (estabelecimento_id, id) on delete cascade,
  foreign key (estabelecimento_id, campanha_id)
    references public.campanhas (estabelecimento_id, id) on delete cascade
);
create index envios_cliente_idx on public.envios (cliente_id, criado_em);

-- ---------------------------------------------------------------------------
-- Auditoria (só inserção)
-- ---------------------------------------------------------------------------
create table public.auditoria (
  id bigint generated always as identity primary key,
  estabelecimento_id uuid references public.estabelecimentos (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  acao text not null,
  alvo_tipo text,
  alvo_id text,
  antes jsonb,
  depois jsonb,
  user_agent text,
  ip_hash text,
  criado_em timestamptz not null default now()
);
create index auditoria_estab_idx on public.auditoria (estabelecimento_id, criado_em desc);

-- ---------------------------------------------------------------------------
-- Limite de requisições do formulário público (sem Redis)
-- ---------------------------------------------------------------------------
create table public.limites_requisicao (
  chave text not null,
  janela_inicio timestamptz not null,
  contagem int not null default 0,
  primary key (chave, janela_inicio)
);

-- ---------------------------------------------------------------------------
-- Gatilhos
-- ---------------------------------------------------------------------------
create function public.tocar_atualizado_em() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.atualizado_em := now();
  return new;
end $$;

create trigger estabelecimentos_atualizado_em
  before update on public.estabelecimentos
  for each row execute function public.tocar_atualizado_em();

-- Todo estabelecimento novo nasce com os dois planos e as quatro automações padrão
create function public.criar_padroes_estabelecimento() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.planos (estabelecimento_id, tipo, carimbos_meta, recompensa_texto) values
    (new.id, 'morador', 10, '1 prato'),
    (new.id, 'turista', 5, '1 sobremesa');

  insert into public.automacoes (estabelecimento_id, tipo, ativa_morador, ativa_turista) values
    (new.id, 'falta_pouco', true, true),
    (new.id, 'recompensa_disponivel', true, true),
    (new.id, 'sentimos_falta', true, false),   -- turistas: desligada por padrão
    (new.id, 'recompensa_esquecida', true, true);
  return new;
end $$;

create trigger estabelecimentos_padroes
  after insert on public.estabelecimentos
  for each row execute function public.criar_padroes_estabelecimento();

-- Registros imutáveis: bloqueia update/delete até para quem tiver permissão de tabela
create function public.bloquear_alteracao() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'Registro imutável: % não permite %', tg_table_name, tg_op;
end $$;

create trigger eventos_carimbo_imutavel
  before update or delete on public.eventos_carimbo
  for each row when (pg_trigger_depth() = 0)
  execute function public.bloquear_alteracao();

create trigger auditoria_imutavel
  before update or delete on public.auditoria
  for each row when (pg_trigger_depth() = 0)
  execute function public.bloquear_alteracao();

-- ===== 20261016000200_seguranca.sql =====
-- Bicuíra Fideliza — permissões e Row Level Security
--
-- Modelo:
--   • anon (público)   → não acessa nenhuma tabela. Cadastro e cartão web passam por rotas
--                         do servidor, que usam a chave secreta e validam slug/token.
--   • authenticated    → super admin vê e edita tudo; dono apenas LÊ o próprio estabelecimento.
--                         Alterações do dono (visitas, carimbos, resgates…) acontecem só por
--                         funções do banco que conferem o estabelecimento (etapa 4).
--   • service_role     → usado apenas no servidor (rotas, tarefas agendadas, Wallet).

-- ---------------------------------------------------------------------------
-- Funções auxiliares (security definer para não cair em recursão no RLS de perfis)
-- ---------------------------------------------------------------------------
create function public.eh_super_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.perfis
    where user_id = (select auth.uid()) and papel = 'super_admin'
  )
$$;

create function public.meu_estabelecimento() returns uuid
language sql stable security definer set search_path = '' as $$
  select p.estabelecimento_id
  from public.perfis p
  join public.estabelecimentos e on e.id = p.estabelecimento_id
  where p.user_id = (select auth.uid()) and p.papel = 'dono'
  limit 1
$$;

-- pode ler/operar dados deste estabelecimento?
create function public.pode_acessar(estab uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.eh_super_admin() or estab = public.meu_estabelecimento()
$$;

revoke all on function public.eh_super_admin() from public, anon;
revoke all on function public.meu_estabelecimento() from public, anon;
revoke all on function public.pode_acessar(uuid) from public, anon;
grant execute on function public.eh_super_admin() to authenticated, service_role;
grant execute on function public.meu_estabelecimento() to authenticated, service_role;
grant execute on function public.pode_acessar(uuid) to authenticated, service_role;

-- funções internas de gatilho não são chamáveis pela API
revoke all on function public.tocar_atualizado_em() from public, anon, authenticated;
revoke all on function public.criar_padroes_estabelecimento() from public, anon, authenticated;
revoke all on function public.bloquear_alteracao() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Permissões de tabela: começa do zero e libera só o necessário
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'estabelecimentos', 'planos', 'perfis', 'clientes', 'visitas', 'eventos_carimbo',
    'consentimentos', 'passes', 'dispositivos_apple', 'registros_apple', 'automacoes',
    'campanhas', 'envios', 'auditoria', 'limites_requisicao'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end $$;


-- Leitura para usuários logados (o RLS filtra as linhas)
grant select on public.estabelecimentos, public.planos, public.perfis, public.clientes,
  public.visitas, public.eventos_carimbo, public.automacoes, public.campanhas,
  public.envios, public.auditoria, public.passes
  to authenticated;

-- Escrita direta: somente o super admin (configuração). O RLS confirma o papel.
grant insert, update, delete on public.estabelecimentos, public.planos, public.perfis to authenticated;
grant update on public.automacoes to authenticated;

-- ---------------------------------------------------------------------------
-- Políticas
-- ---------------------------------------------------------------------------

-- estabelecimentos
create policy "ler estabelecimento" on public.estabelecimentos
  for select to authenticated using (public.pode_acessar(id));
create policy "super admin cria estabelecimento" on public.estabelecimentos
  for insert to authenticated with check (public.eh_super_admin());
create policy "super admin edita estabelecimento" on public.estabelecimentos
  for update to authenticated using (public.eh_super_admin()) with check (public.eh_super_admin());
create policy "super admin remove estabelecimento" on public.estabelecimentos
  for delete to authenticated using (public.eh_super_admin());

-- planos (dono só lê: não edita regras do programa)
create policy "ler planos" on public.planos
  for select to authenticated using (public.pode_acessar(estabelecimento_id));
create policy "super admin cria planos" on public.planos
  for insert to authenticated with check (public.eh_super_admin());
create policy "super admin edita planos" on public.planos
  for update to authenticated using (public.eh_super_admin()) with check (public.eh_super_admin());
create policy "super admin remove planos" on public.planos
  for delete to authenticated using (public.eh_super_admin());

-- perfis
create policy "ler o próprio perfil" on public.perfis
  for select to authenticated using (user_id = (select auth.uid()) or public.eh_super_admin());
create policy "super admin cria perfis" on public.perfis
  for insert to authenticated with check (public.eh_super_admin());
create policy "super admin edita perfis" on public.perfis
  for update to authenticated using (public.eh_super_admin()) with check (public.eh_super_admin());
create policy "super admin remove perfis" on public.perfis
  for delete to authenticated using (public.eh_super_admin());

-- dados operacionais: leitura restrita ao próprio estabelecimento
create policy "ler clientes" on public.clientes
  for select to authenticated using (public.pode_acessar(estabelecimento_id));
create policy "ler visitas" on public.visitas
  for select to authenticated using (public.pode_acessar(estabelecimento_id));
create policy "ler eventos de carimbo" on public.eventos_carimbo
  for select to authenticated using (public.pode_acessar(estabelecimento_id));
create policy "ler passes" on public.passes
  for select to authenticated using (public.pode_acessar(estabelecimento_id));
create policy "ler campanhas" on public.campanhas
  for select to authenticated using (public.pode_acessar(estabelecimento_id));
create policy "ler envios" on public.envios
  for select to authenticated using (public.pode_acessar(estabelecimento_id));
create policy "ler auditoria" on public.auditoria
  for select to authenticated using (
    public.eh_super_admin() or estabelecimento_id = public.meu_estabelecimento()
  );

-- automações: dono liga/desliga as do próprio estabelecimento
create policy "ler automações" on public.automacoes
  for select to authenticated using (public.pode_acessar(estabelecimento_id));
create policy "ligar e desligar automações" on public.automacoes
  for update to authenticated
  using (public.pode_acessar(estabelecimento_id))
  with check (public.pode_acessar(estabelecimento_id));

-- consentimentos, dispositivos_apple, registros_apple, limites_requisicao:
-- nenhuma política para authenticated/anon ⇒ só o servidor (service_role) acessa.

-- ===== 20261016000300_logos.sql =====
-- Logos dos estabelecimentos: leitura pública (aparecem na página, no cartão e no Wallet).
-- O envio é feito só pelo servidor (/admin), com a chave secreta.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

-- ===== 20261016000400_cadastro.sql =====
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

-- ===== 20261016000500_operacao.sql =====
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

-- ===== 20261016000600_metricas.sql =====
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

-- ===== 20261016000700_notificacoes.sql =====
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
