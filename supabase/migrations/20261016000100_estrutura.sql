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
