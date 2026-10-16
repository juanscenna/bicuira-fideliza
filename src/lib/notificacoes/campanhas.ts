import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { enviarMensagens, type Resumo } from "./enviar";
import { resolverPublico, type Publico } from "./publico";

/** Envia uma campanha personalizada agora e grava o resumo. */
export async function processarCampanha(campanhaId: string): Promise<Resumo | null> {
  const admin = supabaseAdmin();
  // trava simples: só quem mudar o status de "agendada" para "enviando" processa
  const { data: c } = await admin
    .from("campanhas")
    .update({ status: "enviando" })
    .eq("id", campanhaId)
    .eq("status", "agendada")
    .select("id, estabelecimento_id, texto, publico")
    .maybeSingle();
  if (!c) return null;

  const ids = await resolverPublico(c.estabelecimento_id, c.publico as Publico);
  const resumo = await enviarMensagens({
    estabelecimentoId: c.estabelecimento_id,
    clienteIds: ids,
    texto: c.texto,
    origem: "personalizada",
    campanhaId: c.id,
  });
  await admin
    .from("campanhas")
    .update({ status: "enviada", total_alvo: ids.length, total_enviados: resumo.enviados, total_pulados: resumo.pulados })
    .eq("id", c.id);
  return resumo;
}

/** Tarefa agendada: envia as campanhas cuja hora chegou. */
export async function processarCampanhasVencidas() {
  const { data } = await supabaseAdmin()
    .from("campanhas")
    .select("id")
    .eq("status", "agendada")
    .lte("agendada_para", new Date().toISOString())
    .limit(20);
  let total = 0;
  for (const c of data ?? []) total += (await processarCampanha(c.id))?.enviados ?? 0;
  return { campanhas: data?.length ?? 0, enviados: total };
}
