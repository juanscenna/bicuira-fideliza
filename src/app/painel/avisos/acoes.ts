"use server";

import { revalidatePath } from "next/cache";
import { exigirDono } from "@/lib/auth";
import { registrarAuditoria } from "@/lib/auditoria";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServidor } from "@/lib/supabase/servidor";
import { LIMITE_MENSAGEM } from "@/lib/wallet/conteudo";
import { resolverPublico, type Publico } from "@/lib/notificacoes/publico";
import { simularPersonalizada, type Resumo } from "@/lib/notificacoes/enviar";
import { processarCampanha } from "@/lib/notificacoes/campanhas";
import { PUBLICOS, type TipoAutomatica, type TipoPublico } from "@/lib/notificacoes/regras";

function publicoValido(p: Publico): Publico | null {
  if (!(p?.tipo in PUBLICOS)) return null;
  return p.tipo === "selecao" ? { tipo: "selecao", clientes: (p.clientes ?? []).slice(0, 2000) } : { tipo: p.tipo as TipoPublico };
}

export async function preverPublico(publico: Publico) {
  const { estabelecimento } = await exigirDono();
  const p = publicoValido(publico);
  if (!p) return null;
  const ids = await resolverPublico(estabelecimento.id, p);
  return simularPersonalizada(estabelecimento.id, ids);
}

export type ResultadoCampanha = { ok: true; agendada: boolean; resumo?: Resumo; quando?: string } | { ok: false; erro: string };

/** Cria a mensagem personalizada: envia agora ou agenda (horário de Garopaba/SP). */
export async function criarCampanha(texto: string, publico: Publico, agendarPara: string | null): Promise<ResultadoCampanha> {
  const sessao = await exigirDono();
  const limpo = texto.replace(/\s+/g, " ").trim();
  if (limpo.length < 3) return { ok: false, erro: "Escreva a mensagem." };
  if (limpo.length > LIMITE_MENSAGEM) return { ok: false, erro: `A mensagem pode ter até ${LIMITE_MENSAGEM} caracteres.` };
  const p = publicoValido(publico);
  if (!p) return { ok: false, erro: "Escolha para quem enviar." };
  if (p.tipo === "selecao" && !p.clientes?.length) return { ok: false, erro: "Selecione pelo menos um cliente." };

  let quando: string | null = null;
  if (agendarPara) {
    // "2026-10-20T18:00" digitado no horário de São Paulo
    const d = new Date(`${agendarPara}:00-03:00`);
    if (Number.isNaN(d.getTime())) return { ok: false, erro: "Data ou hora inválida." };
    if (d.getTime() < Date.now() + 60_000) return { ok: false, erro: "Escolha um horário no futuro." };
    if (d.getTime() > Date.now() + 60 * 86_400_000) return { ok: false, erro: "Agende para no máximo 60 dias à frente." };
    quando = d.toISOString();
  }

  const { data: campanha, error } = await supabaseAdmin()
    .from("campanhas")
    .insert({
      estabelecimento_id: sessao.estabelecimento.id,
      texto: limpo,
      publico: p,
      agendada_para: quando ?? new Date().toISOString(),
      status: "agendada",
      criada_por: sessao.userId,
    })
    .select("id")
    .single();
  if (error || !campanha) return { ok: false, erro: "Não foi possível criar a mensagem." };

  await registrarAuditoria({
    acao: quando ? "campanha.agendar" : "campanha.enviar",
    userId: sessao.userId,
    estabelecimentoId: sessao.estabelecimento.id,
    alvoTipo: "campanha",
    alvoId: campanha.id,
    depois: { texto: limpo, publico: p.tipo, agendada_para: quando },
  });

  if (quando) {
    revalidatePath("/painel/avisos");
    return { ok: true, agendada: true, quando };
  }
  const resumo = (await processarCampanha(campanha.id)) ?? undefined;
  revalidatePath("/painel/avisos");
  return { ok: true, agendada: false, resumo };
}

export async function cancelarCampanha(id: string) {
  const sessao = await exigirDono();
  const { data } = await supabaseAdmin()
    .from("campanhas")
    .update({ status: "cancelada" })
    .eq("id", id)
    .eq("estabelecimento_id", sessao.estabelecimento.id)
    .eq("status", "agendada")
    .select("id");
  if (data?.length) {
    await registrarAuditoria({ acao: "campanha.cancelar", userId: sessao.userId, estabelecimentoId: sessao.estabelecimento.id, alvoTipo: "campanha", alvoId: id });
  }
  revalidatePath("/painel/avisos");
  return Boolean(data?.length);
}

export async function alternarAutomacao(tipo: TipoAutomatica, plano: "morador" | "turista", ativa: boolean) {
  const sessao = await exigirDono();
  const supabase = await supabaseServidor(); // o RLS só deixa mexer nas do próprio estabelecimento
  const coluna = plano === "morador" ? "ativa_morador" : "ativa_turista";
  const { error } = await supabase.from("automacoes").update({ [coluna]: ativa }).eq("estabelecimento_id", sessao.estabelecimento.id).eq("tipo", tipo);
  if (error) return false;
  await registrarAuditoria({
    acao: "automacao.alternar",
    userId: sessao.userId,
    estabelecimentoId: sessao.estabelecimento.id,
    alvoTipo: "automacao",
    alvoId: tipo,
    depois: { plano, ativa },
  });
  revalidatePath("/painel/avisos");
  return true;
}

/** Busca para a seleção manual de clientes. */
export async function buscarClientes(q: string) {
  await exigirDono();
  const supabase = await supabaseServidor();
  let consulta = supabase.from("clientes_resumo").select("id, nome, codigo, plano_tipo").order("nome").limit(50);
  const termo = q.trim().replace(/[%_,()*\\]/g, " ");
  if (termo) consulta = consulta.or(`nome.ilike.*${termo}*,codigo.ilike.${termo.toUpperCase()}*`);
  const { data } = await consulta;
  return data ?? [];
}
