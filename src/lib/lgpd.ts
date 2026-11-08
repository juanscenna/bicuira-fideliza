import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { encerrarObjetoGoogle } from "@/lib/wallet/google";

/**
 * Apaga o cliente DE VEZ (LGPD art. 18, VI): o cadastro, o cartão, as visitas, os carimbos, os resgates,
 * os consentimentos, as mensagens enviadas e as notificações saem do banco (as tabelas apagam em cascata).
 * Nada fica como "cliente removido": ele some da lista e das métricas, e o link do cartão para de funcionar.
 * O cartão salvo no Google Wallet é encerrado (vai para "expirados" no celular do cliente).
 * Usado pelo dono (painel), pelo admin e pelo próprio cliente no cartão.
 */
export async function apagarClientePorId(clienteId: string): Promise<{ ok: true; codigo: string } | { ok: false; erro: string }> {
  const admin = supabaseAdmin();
  const { data: c } = await admin.from("clientes").select("codigo, passes (google_object_id)").eq("id", clienteId).maybeSingle();
  if (!c) return { ok: false, erro: "Cliente não encontrado." };
  const pass = (Array.isArray(c.passes) ? c.passes[0] : c.passes) as { google_object_id: string | null } | null;

  const { error } = await admin.from("clientes").delete().eq("id", clienteId);
  if (error) return { ok: false, erro: error.message };

  if (pass?.google_object_id) await encerrarObjetoGoogle(pass.google_object_id).catch((e) => console.error("[wallet:google] encerrar", e));
  return { ok: true, codigo: c.codigo as string };
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
