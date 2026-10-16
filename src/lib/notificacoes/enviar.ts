import "server-only";
import { after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { avisarCartoes } from "@/lib/tempo-real-servidor";
import { avisarAparelhosApple } from "@/lib/wallet/apple";
import { dadosPorCliente } from "@/lib/wallet/dados";
import { mensagemGoogle } from "@/lib/wallet/google";
import { walletVisivel } from "@/lib/wallet/config";
import { decidirEnvio, type Origem, type TipoAutomatica } from "./regras";

type Pedido = {
  estabelecimentoId: string;
  clienteIds: string[];
  /** Texto fixo, ou um por cliente (automáticas) */
  texto: string | ((clienteId: string) => string);
  origem: Origem;
  campanhaId?: string;
  automacaoTipo?: TipoAutomatica;
};

export type Resumo = { enviados: number; pulados: number; motivosPulo: Record<string, number> };

/**
 * Envia uma mensagem pelo cartão de cada cliente:
 *  • grava a mensagem no cartão (aparece no topo do cartão web e no verso do Apple Wallet, com aviso);
 *  • registra o envio como "enviado" (nunca "entregue": a entrega não é garantida);
 *  • depois da resposta, avisa os iPhones (APNs) e manda a mensagem ao Google Wallet.
 * Clientes acima do limite são pulados e contados no resumo.
 */
export async function enviarMensagens(p: Pedido): Promise<Resumo> {
  const admin = supabaseAdmin();
  const resumo: Resumo = { enviados: 0, pulados: 0, motivosPulo: {} };
  if (p.clienteIds.length === 0) return resumo;

  const { data: estab } = await admin.from("estabelecimentos").select("max_personalizadas_semana").eq("id", p.estabelecimentoId).single();
  const maxSemana = estab?.max_personalizadas_semana ?? 2;

  const historico = await carregarHistorico(p.clienteIds);

  const { data: clientes } = await admin
    .from("clientes")
    .select("id, token_cartao, ciclo, passes (serial, google_object_id, registros_apple (device_library_id))")
    .in("id", p.clienteIds)
    .eq("estabelecimento_id", p.estabelecimentoId)
    .is("anonimizado_em", null);

  const agora = new Date().toISOString();
  const tokens: string[] = [];
  const paraWallet: { clienteId: string; texto: string; notificarGoogle: boolean }[] = [];

  for (const c of clientes ?? []) {
    const texto = typeof p.texto === "function" ? p.texto(c.id) : p.texto;
    const decisao = decidirEnvio(p.origem, historico.get(c.id) ?? { personalizadas7d: 0, enviadas24h: 0 }, maxSemana);
    const base = {
      estabelecimento_id: p.estabelecimentoId,
      cliente_id: c.id,
      campanha_id: p.campanhaId ?? null,
      automacao_tipo: p.automacaoTipo ?? null,
      origem: p.origem,
      texto,
      ciclo: c.ciclo,
    };
    if (!decisao.enviar) {
      await admin.from("envios").insert({ ...base, status: "pulado", motivo: decisao.motivo });
      resumo.pulados++;
      resumo.motivosPulo[decisao.motivo] = (resumo.motivosPulo[decisao.motivo] ?? 0) + 1;
      continue;
    }

    const pass = (Array.isArray(c.passes) ? c.passes[0] : c.passes) as
      | { serial: string; google_object_id: string | null; registros_apple: unknown[] | null }
      | null;
    const canais = ["web", ...((pass?.registros_apple?.length ?? 0) > 0 ? ["apple"] : []), ...(pass?.google_object_id ? ["google"] : [])];

    const { data: atual } = await admin.from("passes").select("versao").eq("cliente_id", c.id).single();
    await admin
      .from("passes")
      .update({ mensagem_atual: texto, mensagem_em: agora, versao: (atual?.versao ?? 1) + 1, atualizado_em: agora })
      .eq("cliente_id", c.id);
    await admin.from("envios").insert({ ...base, status: "enviado", canais });
    resumo.enviados++;
    tokens.push(c.token_cartao);
    paraWallet.push({ clienteId: c.id, texto, notificarGoogle: decisao.notificarGoogle });
  }

  await avisarCartoes(tokens);
  if (!walletVisivel()) return resumo; // piloto só com cartão web
  after(async () => {
    for (const w of paraWallet) {
      const d = await dadosPorCliente(w.clienteId);
      if (!d) continue;
      await Promise.allSettled([avisarAparelhosApple(d.serial), mensagemGoogle(d, w.texto, w.notificarGoogle)]);
    }
  });
  return resumo;
}

/** Mensagens já enviadas a cada cliente (para os limites semanal e de 24 h). */
export async function carregarHistorico(clienteIds: string[]) {
  const admin = supabaseAdmin();
  const seteDias = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const umDia = Date.now() - 86_400_000;
  const historico = new Map<string, { personalizadas7d: number; enviadas24h: number }>();
  for (let i = 0; i < clienteIds.length; i += 500) {
    const { data } = await admin
      .from("envios")
      .select("cliente_id, origem, criado_em")
      .in("cliente_id", clienteIds.slice(i, i + 500))
      .eq("status", "enviado")
      .gte("criado_em", seteDias);
    for (const e of data ?? []) {
      const h = historico.get(e.cliente_id) ?? { personalizadas7d: 0, enviadas24h: 0 };
      if (e.origem === "personalizada") h.personalizadas7d++;
      if (new Date(e.criado_em).getTime() >= umDia) h.enviadas24h++;
      historico.set(e.cliente_id, h);
    }
  }
  return historico;
}

/** Prévia de uma personalizada: quantos receberiam e quantos seriam pulados (sem enviar nada). */
export async function simularPersonalizada(estabelecimentoId: string, clienteIds: string[]) {
  const { data: estab } = await supabaseAdmin().from("estabelecimentos").select("max_personalizadas_semana").eq("id", estabelecimentoId).single();
  const historico = await carregarHistorico(clienteIds);
  let enviariam = 0;
  const motivosPulo: Record<string, number> = {};
  for (const id of clienteIds) {
    const d = decidirEnvio("personalizada", historico.get(id) ?? { personalizadas7d: 0, enviadas24h: 0 }, estab?.max_personalizadas_semana ?? 2);
    if (d.enviar) enviariam++;
    else motivosPulo[d.motivo] = (motivosPulo[d.motivo] ?? 0) + 1;
  }
  return { total: clienteIds.length, enviariam, pulados: clienteIds.length - enviariam, motivosPulo, maxSemana: estab?.max_personalizadas_semana ?? 2 };
}
