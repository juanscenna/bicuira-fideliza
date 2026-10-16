"use server";

import { revalidatePath } from "next/cache";
import { exigirDono } from "@/lib/auth";
import { origemDaRequisicao } from "@/lib/auditoria";
import { supabaseServidor } from "@/lib/supabase/servidor";
import { lerReais } from "@/lib/dominio/dinheiro";
import { aposMudanca, type EstadoOperacao } from "@/lib/painel/apos-mudanca";

export type Resultado = { ok: true; estado: Omit<EstadoOperacao, "token"> } | { ok: false; erro: string };

const MENSAGENS: Record<string, string> = {
  limite: "",
  incompleto: "A recompensa só pode ser resgatada com o cartão completo.",
  nao_encontrado: "Não encontrado. Atualize a página.",
  inativo: "Estabelecimento desativado. Fale com a Bicuíra.",
  expirado: "Não dá mais para desfazer (passou o tempo ou já houve resgate).",
  plano_invalido: "Esse plano não está disponível.",
  mesmo_plano: "O cliente já está nesse plano.",
  valor_invalido: "Valor inválido.",
};

/** Chama uma função do banco com o login do dono e traduz o resultado para a tela. */
async function operar(funcao: string, args: Record<string, unknown>, revalidar: string[] = []): Promise<Resultado> {
  await exigirDono();
  const { userAgent, ipHash } = await origemDaRequisicao();
  const supabase = await supabaseServidor();
  const { data, error } = await supabase.rpc(funcao, { ...args, p_user_agent: userAgent, p_ip_hash: ipHash });
  if (error) {
    const [codigo, ...resto] = error.message.split(": ");
    const texto = MENSAGENS[codigo];
    if (texto === undefined) console.error(`[${funcao}]`, error.message);
    return { ok: false, erro: texto || resto.join(": ") || "Não foi possível concluir. Tente de novo." };
  }
  const estado = data as EstadoOperacao;
  await aposMudanca(estado);
  for (const caminho of ["/painel", `/painel/clientes/${estado.cliente_id}`, ...revalidar]) revalidatePath(caminho);
  const semToken: Partial<EstadoOperacao> = { ...estado };
  delete semToken.token; // o token do cartão não vai para a tela do painel
  return { ok: true, estado: semToken as Omit<EstadoOperacao, "token"> };
}

export async function registrarVisita(clienteId: string, valorTexto: string, descricao: string): Promise<Resultado> {
  const centavos = lerReais(valorTexto);
  if (centavos === null) return { ok: false, erro: "Digite o valor gasto. Ex.: 42,50" };
  return operar("registrar_visita", { p_cliente: clienteId, p_valor_centavos: centavos, p_descricao: descricao.slice(0, 200) });
}

export async function ajustarCarimbos(clienteId: string, delta: 1 | -1, motivo: string): Promise<Resultado> {
  return operar("ajustar_carimbos", { p_cliente: clienteId, p_delta: delta, p_motivo: motivo.slice(0, 200) });
}

export async function resgatar(clienteId: string): Promise<Resultado> {
  return operar("resgatar", { p_cliente: clienteId });
}

export async function trocarPlano(clienteId: string, plano: "morador" | "turista"): Promise<Resultado> {
  return operar("trocar_plano", { p_cliente: clienteId, p_plano: plano });
}

export async function editarVisita(visitaId: string, valorTexto: string, descricao: string): Promise<Resultado> {
  const centavos = lerReais(valorTexto);
  if (centavos === null) return { ok: false, erro: "Digite o valor gasto. Ex.: 42,50" };
  return operar("editar_visita", { p_visita: visitaId, p_valor_centavos: centavos, p_descricao: descricao.slice(0, 200) });
}

export async function desfazerVisita(visitaId: string): Promise<Resultado> {
  return operar("desfazer_visita", { p_visita: visitaId });
}

export async function desfazerAjuste(eventoId: string): Promise<Resultado> {
  return operar("desfazer_ajuste", { p_evento: eventoId });
}

/** Código digitado ou lido no QR → id do cliente (só do próprio estabelecimento, pelo RLS). */
export async function buscarPorCodigo(codigo: string): Promise<{ id: string } | { erro: string }> {
  await exigirDono();
  const limpo = codigo.trim().toUpperCase();
  if (!/^[A-HJKMNP-Z]\d{4}$/.test(limpo)) return { erro: "O código tem 1 letra e 4 números. Ex.: K4827" };
  const supabase = await supabaseServidor();
  const { data } = await supabase.from("clientes").select("id").eq("codigo", limpo).is("anonimizado_em", null).maybeSingle();
  return data ? { id: data.id } : { erro: `Nenhum cartão com o código ${limpo}.` };
}
