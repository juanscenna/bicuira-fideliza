-- Notificação do próprio site (web push): o cliente aceita na página do cartão.
-- Só o servidor lê e grava (chave secreta); RLS ligado e sem políticas = ninguém de fora acessa.
create table public.push_inscricoes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  criado_em timestamptz not null default now()
);
create index push_inscricoes_cliente_idx on public.push_inscricoes (cliente_id);
alter table public.push_inscricoes enable row level security;
