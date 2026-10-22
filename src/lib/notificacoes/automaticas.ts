import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { EstadoOperacao } from "@/lib/painel/apos-mudanca";
import { enviarMensagens } from "./enviar";
import type { TipoAutomatica } from "./regras";
import { termosDo, textoAutomaticoDo } from "@/temas/vocabulario";

async function ativa(estabelecimentoId: string, tipo: TipoAutomatica, plano: "morador" | "turista") {
  const { data } = await supabaseAdmin()
    .from("automacoes")
    .select("ativa_morador, ativa_turista")
    .eq("estabelecimento_id", estabelecimentoId)
    .eq("tipo", tipo)
    .single();
  return plano === "morador" ? Boolean(data?.ativa_morador) : Boolean(data?.ativa_turista);
}

/** Texto da automática no vocabulário do estabelecimento (ex.: pousada: "na recepção"). */
async function textoNoVocabulario(estabelecimentoId: string) {
  const { data } = await supabaseAdmin().from("estabelecimentos").select("slug").eq("id", estabelecimentoId).single();
  const termos = termosDo(data?.slug ?? "");
  return (tipo: TipoAutomatica, c: { recompensa: string; carimbos: number; meta: number }) => textoAutomaticoDo(tipo, c, termos);
}

/** Já saiu esta automática para o cliente neste ciclo do cartão? (evita repetir após −1/+1) */
async function jaEnviadaNoCiclo(clienteId: string, tipo: TipoAutomatica) {
  const admin = supabaseAdmin();
  const { data: c } = await admin.from("clientes").select("ciclo").eq("id", clienteId).single();
  const { count } = await admin
    .from("envios")
    .select("id", { count: "exact", head: true })
    .eq("cliente_id", clienteId)
    .eq("automacao_tipo", tipo)
    .eq("ciclo", c?.ciclo ?? 0)
    .eq("status", "enviado");
  return (count ?? 0) > 0;
}

/** Depois de uma visita/carimbo: "falta pouco" ou "recompensa disponível", se ligadas. */
export async function automaticasDaOperacao(estabelecimentoId: string, e: EstadoOperacao) {
  const tipo: TipoAutomatica | null = e.completou ? "recompensa_disponivel" : e.falta_um ? "falta_pouco" : null;
  if (!tipo) return;
  if (!(await ativa(estabelecimentoId, tipo, e.plano))) return;
  if (await jaEnviadaNoCiclo(e.cliente_id, tipo)) return;
  const texto = await textoNoVocabulario(estabelecimentoId);
  await enviarMensagens({
    estabelecimentoId,
    clienteIds: [e.cliente_id],
    texto: texto(tipo, e),
    origem: "automatica",
    automacaoTipo: tipo,
  });
}

/** Tarefa diária: "sentimos sua falta" e "recompensa esquecida". */
export async function processarAutomaticasDiarias() {
  const admin = supabaseAdmin();
  const { data: candidatos } = await admin.rpc("candidatos_automaticos");
  const lista = (candidatos ?? []) as { estabelecimento_id: string; cliente_id: string; tipo: TipoAutomatica }[];
  let enviados = 0;
  for (const tipo of ["sentimos_falta", "recompensa_esquecida"] as const) {
    const porEstab = new Map<string, string[]>();
    for (const c of lista.filter((x) => x.tipo === tipo)) porEstab.set(c.estabelecimento_id, [...(porEstab.get(c.estabelecimento_id) ?? []), c.cliente_id]);
    for (const [estab, ids] of porEstab) {
      const { data: clientes } = await admin.from("clientes_resumo").select("id, carimbos_atuais, meta, recompensa").in("id", ids);
      const info = new Map((clientes ?? []).map((c) => [c.id, c]));
      const texto = await textoNoVocabulario(estab);
      const r = await enviarMensagens({
        estabelecimentoId: estab,
        clienteIds: ids,
        origem: "automatica",
        automacaoTipo: tipo,
        texto: (id) => {
          const c = info.get(id);
          return texto(tipo, { recompensa: c?.recompensa ?? "", carimbos: c?.carimbos_atuais ?? 0, meta: c?.meta ?? 0 });
        },
      });
      enviados += r.enviados;
    }
  }
  return { enviados };
}
