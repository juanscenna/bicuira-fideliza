-- Selos dados: base da cobrança mensal (valor fixo + valor por selo).
--
-- Regra (ver docs/DECISOES.md):
--   conta  +1  cada selo ganho: visita que deu selo, +1 manual, edição de visita que passou a dar selo
--   conta  -1  cada correção desses selos: desfazer/remover visita, -1 manual, edição que tirou o selo
--   não conta  resgate (o cartão zera, mas os selos foram dados) e troca de plano
--   mês = calendário de Brasília (America/Sao_Paulo); correção conta no mês em que foi feita
--
-- Registro próprio, sem ligação com o cliente: apagar um cliente (LGPD) não muda selos já cobrados.

create table public.selos_dados (
  evento_id uuid primary key, -- id do evento de carimbo (sem chave estrangeira: sobrevive à exclusão do cliente)
  estabelecimento_id uuid not null references public.estabelecimentos (id) on delete cascade,
  delta int not null check (delta <> 0),
  criado_em timestamptz not null
);
create index selos_dados_estab_idx on public.selos_dados (estabelecimento_id, criado_em);

alter table public.selos_dados enable row level security;
create policy "ler selos dados" on public.selos_dados
  for select to authenticated using (public.pode_acessar(estabelecimento_id));
revoke insert, update, delete on public.selos_dados from public, anon, authenticated;

-- Quanto um evento de carimbo vale na cobrança (0 = não conta).
create function public._selos_do_evento(e public.eventos_carimbo) returns int
language sql stable security definer set search_path = '' as $$
  select case
    when e.tipo in ('visita', 'manual_mais', 'manual_menos', 'ajuste_edicao') then e.delta
    when e.tipo = 'desfazer' and exists (
      select 1 from public.eventos_carimbo o
      where o.id = e.evento_desfeito_id and o.tipo in ('visita', 'manual_mais', 'manual_menos', 'ajuste_edicao')
    ) then e.delta
    else 0
  end
$$;

create function public._registrar_selos_dados() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v int := public._selos_do_evento(new);
begin
  if v <> 0 then
    insert into public.selos_dados (evento_id, estabelecimento_id, delta, criado_em)
    values (new.id, new.estabelecimento_id, v, new.criado_em)
    on conflict (evento_id) do nothing;
  end if;
  return new;
end $$;

create trigger registrar_selos_dados
  after insert on public.eventos_carimbo
  for each row execute function public._registrar_selos_dados();

revoke all on function public._selos_do_evento(public.eventos_carimbo) from public, anon, authenticated;
revoke all on function public._registrar_selos_dados() from public, anon, authenticated;

-- Histórico que já existe (clientes apagados antes desta migration não estão mais no banco).
insert into public.selos_dados (evento_id, estabelecimento_id, delta, criado_em)
select e.id, e.estabelecimento_id, public._selos_do_evento(e), e.criado_em
from public.eventos_carimbo e
where public._selos_do_evento(e) <> 0
on conflict (evento_id) do nothing;

-- Selos dados por mês (mais recente primeiro), com zero nos meses sem selo.
-- Roda com as permissões de quem chama: o dono só vê o próprio estabelecimento; o admin vê todos.
create function public.selos_por_mes(p_estab uuid default null, p_meses int default 12)
returns table (mes date, selos int)
language sql stable security invoker set search_path = '' as $$
  with estab as (select coalesce(p_estab, public.meu_estabelecimento()) as id),
  meses as (
    select (date_trunc('month', (now() at time zone 'America/Sao_Paulo')) - make_interval(months => n))::date as mes
    from generate_series(0, greatest(least(p_meses, 36), 1) - 1) n
  ),
  somas as (
    select date_trunc('month', s.criado_em at time zone 'America/Sao_Paulo')::date as mes, sum(s.delta)::int as selos
    from public.selos_dados s, estab
    where s.estabelecimento_id = estab.id
    group by 1
  )
  select m.mes, greatest(coalesce(s.selos, 0), 0) as selos
  from meses m left join somas s on s.mes = m.mes
  order by m.mes desc
$$;

revoke all on function public.selos_por_mes(uuid, int) from public, anon;
grant execute on function public.selos_por_mes(uuid, int) to authenticated, service_role;
