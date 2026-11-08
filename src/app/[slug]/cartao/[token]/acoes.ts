"use server";

import { revalidatePath } from "next/cache";
import { estabelecimentoPorSlug } from "@/lib/publico";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { registrarAuditoria } from "@/lib/auditoria";
import { clientePorToken } from "@/lib/cartao";
import { anonimizarClientePorId } from "@/lib/lgpd";

const TOKEN_VALIDO = /^[0-9a-f]{48}$/;

/**
 * O cliente liga ou desliga as novidades e promoções no próprio cartão (LGPD art. 8º, § 5º:
 * o consentimento pode ser revogado a qualquer momento, de forma fácil).
 * Os avisos do próprio cartão (carimbos e recompensas) continuam.
 */
export async function definirNovidades(slug: string, token: string, aceita: boolean): Promise<{ ok: boolean; aceita: boolean }> {
  if (!TOKEN_VALIDO.test(token)) return { ok: false, aceita: !aceita };
  const estab = await estabelecimentoPorSlug(slug);
  if (!estab) return { ok: false, aceita: !aceita };

  const { data, error } = await supabaseAdmin()
    .from("clientes")
    .update({ novidades_aceitas_em: aceita ? new Date().toISOString() : null })
    .eq("estabelecimento_id", estab.id)
    .eq("token_cartao", token)
    .is("anonimizado_em", null)
    .select("id")
    .maybeSingle();
  if (error || !data) return { ok: false, aceita: !aceita };

  await registrarAuditoria({
    acao: "cliente.novidades",
    userId: null,
    estabelecimentoId: estab.id,
    alvoTipo: "cliente",
    alvoId: data.id as string,
    depois: { aceita },
  });
  revalidatePath(`/${slug}/cartao/${token}`);
  return { ok: true, aceita };
}


/**
 * "Apagar meus dados" (LGPD art. 18, VI), pelo próprio cliente, no cartão.
 * Mesma exclusão do admin: apaga nome e telefone, o link do cartão para de funcionar.
 */
export async function apagarMeusDados(slug: string, token: string): Promise<{ ok: boolean }> {
  const estab = await estabelecimentoPorSlug(slug);
  const clienteId = estab ? await clientePorToken(estab.id, token) : null;
  if (!estab || !clienteId) return { ok: false };
  const r = await anonimizarClientePorId(clienteId);
  if (!r.ok) {
    console.error("[apagar-meus-dados]", r.erro);
    return { ok: false };
  }
  await registrarAuditoria({
    acao: "cliente.anonimizar",
    userId: null,
    estabelecimentoId: estab.id,
    alvoTipo: "cliente",
    alvoId: clienteId,
    depois: { pedido_por: "cliente" },
  });
  return { ok: true };
}
