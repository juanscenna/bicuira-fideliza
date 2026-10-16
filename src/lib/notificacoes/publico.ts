import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { TipoPublico } from "./regras";

export type Publico = { tipo: TipoPublico; clientes?: string[] };

/** Clientes atingidos por um público (sempre limitado ao estabelecimento informado). */
export async function resolverPublico(estabelecimentoId: string, publico: Publico): Promise<string[]> {
  let q = supabaseAdmin()
    .from("clientes_resumo")
    .select("id, carimbos_atuais, meta")
    .eq("estabelecimento_id", estabelecimentoId);
  if (publico.tipo === "moradores") q = q.eq("plano_tipo", "morador");
  if (publico.tipo === "turistas") q = q.eq("plano_tipo", "turista");
  if (publico.tipo === "inativos") q = q.eq("inativo", true);
  if (publico.tipo === "recompensa") q = q.eq("recompensa_disponivel", true);
  if (publico.tipo === "selecao") {
    const ids = (publico.clientes ?? []).filter((id) => /^[0-9a-f-]{36}$/.test(id)).slice(0, 2000);
    if (ids.length === 0) return [];
    q = q.in("id", ids);
  }
  const { data } = await q.limit(5000);
  return (data ?? [])
    .filter((c) => publico.tipo !== "perto" || (c.meta - c.carimbos_atuais >= 1 && c.meta - c.carimbos_atuais <= 2))
    .map((c) => c.id);
}
