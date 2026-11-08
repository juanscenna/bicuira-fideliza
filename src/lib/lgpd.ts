import "server-only";
import { randomBytes } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * LGPD art. 18: apaga os dados pessoais de um cliente (nome e telefone), troca o link secreto do cartão
 * (o antigo para de funcionar), remove o cartão do Wallet e as notificações.
 * As visitas continuam, sem identificar a pessoa, para não distorcer as métricas.
 * Usado pelo admin (pedido no balcão ou por contato) e pelo próprio cliente no cartão.
 */
export async function anonimizarClientePorId(clienteId: string): Promise<{ ok: true } | { ok: false; erro: string }> {
  const admin = supabaseAdmin();
  const { error } = await admin
    .from("clientes")
    .update({
      nome: "Cliente removido",
      telefone: null,
      anonimizado_em: new Date().toISOString(),
      novidades_aceitas_em: null,
      token_cartao: randomBytes(24).toString("hex"),
    })
    .eq("id", clienteId)
    .is("anonimizado_em", null);
  if (error) return { ok: false, erro: error.message };
  await admin.from("passes").delete().eq("cliente_id", clienteId);
  await admin.from("push_inscricoes").delete().eq("cliente_id", clienteId);
  return { ok: true };
}

/**
 * LGPD art. 18, II: cópia dos dados do próprio cliente, em formato legível (JSON).
 * Só dados dele: nada de outros clientes nem de quem registrou a visita.
 */
export async function dadosDoCliente(clienteId: string) {
  const admin = supabaseAdmin();
  const [{ data: c }, { data: visitas }, { data: consentimentos }, { data: push }] = await Promise.all([
    admin
      .from("clientes")
      .select("nome, telefone, codigo, plano_tipo, carimbos_atuais, criado_em, ultima_visita_em, novidades_aceitas_em")
      .eq("id", clienteId)
      .single(),
    admin
      .from("visitas")
      .select("criado_em, valor_centavos, descricao, gerou_carimbo, desfeita_em")
      .eq("cliente_id", clienteId)
      .order("criado_em"),
    admin.from("consentimentos").select("versao_texto, aceito_em, novidades").eq("cliente_id", clienteId).order("aceito_em"),
    admin.from("push_inscricoes").select("criado_em").eq("cliente_id", clienteId),
  ]);
  if (!c) return null;
  return {
    cadastro: {
      nome: c.nome,
      celular: c.telefone,
      codigo_do_cartao: c.codigo,
      perfil: c.plano_tipo === "turista" ? "visitante" : "morador",
      criado_em: c.criado_em,
      ultima_visita_em: c.ultima_visita_em,
    },
    cartao: { carimbos_atuais: c.carimbos_atuais },
    visitas: (visitas ?? []).map((v) => ({
      data: v.criado_em,
      valor_reais: (v.valor_centavos / 100).toFixed(2),
      descricao: v.descricao,
      gerou_carimbo: v.gerou_carimbo,
      desfeita: Boolean(v.desfeita_em),
    })),
    consentimentos: (consentimentos ?? []).map((s) => ({
      versao_do_texto: s.versao_texto,
      aceito_em: s.aceito_em,
      aceitou_novidades: s.novidades,
    })),
    novidades_e_promocoes: c.novidades_aceitas_em ? { ligadas_desde: c.novidades_aceitas_em } : "desligadas",
    notificacoes_no_celular: (push ?? []).map((p) => ({ aparelho_inscrito_em: p.criado_em })),
  };
}
