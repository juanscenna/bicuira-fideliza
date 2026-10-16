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
