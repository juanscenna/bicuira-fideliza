-- Remover uma visita lançada por engano, a qualquer momento (o "desfazer" vale só por 10 min).
-- A visita fica no histórico como removida (riscada) e sai das métricas.
-- Se ela deu selo no cartão atual, o selo sai junto (evento compensatório, nada é apagado).
-- Se já houve resgate depois dela, o cartão não muda (o selo já foi usado na recompensa).
create function public.remover_visita(p_visita uuid, p_user_agent text default null, p_ip_hash text default null)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v public.visitas;
  c public.clientes;
  v_meta int;
  v_evento uuid;
  v_delta int := 0;
  v_aviso text := null;
begin
  select * into v from public.visitas where id = p_visita and estabelecimento_id = public.meu_estabelecimento();
  if not found or v.desfeita_em is not null then
    perform public._erro('nao_encontrado', 'Visita não encontrada');
  end if;
  c := public._cliente_para_operar(v.cliente_id);
  v_meta := public._meta_do_plano(c.estabelecimento_id, c.plano_tipo);

  update public.visitas set desfeita_em = now() where id = v.id;
  update public.clientes set ultima_visita_em = (
    select max(criado_em) from public.visitas where cliente_id = c.id and desfeita_em is null
  ) where id = c.id;

  if v.gerou_carimbo then
    if v.ciclo < c.ciclo then
      v_aviso := 'resgate_posterior';
    elsif c.carimbos_atuais > 0 then
      select id into v_evento from public.eventos_carimbo where visita_id = v.id and tipo = 'visita';
      insert into public.eventos_carimbo (estabelecimento_id, cliente_id, tipo, delta, saldo_apos, ciclo, visita_id, evento_desfeito_id, motivo, criado_por)
      values (c.estabelecimento_id, c.id, 'desfazer', -1, c.carimbos_atuais - 1, c.ciclo, v.id, v_evento, 'visita removida', (select auth.uid()));
      perform public._aplicar_saldo(c, c.carimbos_atuais - 1, v_meta);
      v_delta := -1;
    end if;
  end if;

  perform public._auditar(c.estabelecimento_id, 'visita.remover', 'visita', v.id::text,
    jsonb_build_object('valor_centavos', v.valor_centavos, 'gerou_carimbo', v.gerou_carimbo, 'criado_em', v.criado_em),
    jsonb_build_object('carimbo_removido', v_delta = -1), p_user_agent, p_ip_hash);
  return public._estado(c.id, jsonb_build_object('delta', v_delta, 'aviso', v_aviso));
end $$;

revoke execute on function public.remover_visita(uuid, text, text) from public, anon;
grant execute on function public.remover_visita(uuid, text, text) to authenticated;
