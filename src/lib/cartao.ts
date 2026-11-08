import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** O que o cartão do cliente mostra (cartão web e, depois, Wallet). Só dados do próprio cliente. */
export type EstadoCartao = {
  nome: string;
  codigo: string;
  plano: "morador" | "turista";
  carimbos: number;
  meta: number;
  recompensa: string;
  recompensaDisponivel: boolean;
  mensagem: string | null;
  mensagemEm: string | null;
  versao: number;
};

const TOKEN_VALIDO = /^[0-9a-f]{48}$/;

/** Busca o cartão pelo token secreto, conferindo que é do estabelecimento do endereço. */
export async function carregarCartao(estabelecimentoId: string, token: string): Promise<EstadoCartao | null> {
  if (!TOKEN_VALIDO.test(token)) return null;
  const admin = supabaseAdmin();
  const { data: c } = await admin
    .from("clientes")
    .select("id, nome, codigo, plano_tipo, carimbos_atuais, recompensa_desde, anonimizado_em, passes (versao, mensagem_atual, mensagem_em)")
    .eq("token_cartao", token)
    .eq("estabelecimento_id", estabelecimentoId)
    .maybeSingle();
  if (!c || c.anonimizado_em) return null;

  const { data: plano } = await admin
    .from("planos")
    .select("carimbos_meta, recompensa_texto")
    .eq("estabelecimento_id", estabelecimentoId)
    .eq("tipo", c.plano_tipo)
    .single();
  const pass = (Array.isArray(c.passes) ? c.passes[0] : c.passes) as
    | { versao: number; mensagem_atual: string | null; mensagem_em: string | null }
    | null;
  const meta = plano?.carimbos_meta ?? 10;

  return {
    nome: c.nome,
    codigo: c.codigo,
    plano: c.plano_tipo as EstadoCartao["plano"],
    carimbos: Math.min(c.carimbos_atuais, meta),
    meta,
    recompensa: plano?.recompensa_texto ?? "",
    recompensaDisponivel: c.carimbos_atuais >= meta,
    mensagem: pass?.mensagem_atual ?? null,
    mensagemEm: pass?.mensagem_em ?? null,
    versao: pass?.versao ?? 1,
  };
}

/** Se este cartão já foi enviado ao Google Wallet alguma vez (para não abrir o Wallet sozinho de novo). */
export async function jaFoiAoGoogleWallet(estabelecimentoId: string, token: string) {
  if (!TOKEN_VALIDO.test(token)) return true;
  const { data } = await supabaseAdmin()
    .from("clientes")
    .select("passes (google_object_id)")
    .eq("token_cartao", token)
    .eq("estabelecimento_id", estabelecimentoId)
    .maybeSingle();
  const p = (Array.isArray(data?.passes) ? data.passes[0] : data?.passes) as { google_object_id: string | null } | null | undefined;
  return Boolean(p?.google_object_id);
}

/** Se o cliente aceitou novidades e promoções (para mostrar o botão certo no cartão). */
export async function novidadesAceitas(estabelecimentoId: string, token: string) {
  if (!TOKEN_VALIDO.test(token)) return false;
  const { data } = await supabaseAdmin()
    .from("clientes")
    .select("novidades_aceitas_em")
    .eq("estabelecimento_id", estabelecimentoId)
    .eq("token_cartao", token)
    .is("anonimizado_em", null)
    .maybeSingle();
  return Boolean(data?.novidades_aceitas_em);
}

/** Id do cliente dono do cartão (token secreto + estabelecimento do endereço), ou null. */
export async function clientePorToken(estabelecimentoId: string, token: string) {
  if (!TOKEN_VALIDO.test(token)) return null;
  const { data } = await supabaseAdmin()
    .from("clientes")
    .select("id")
    .eq("estabelecimento_id", estabelecimentoId)
    .eq("token_cartao", token)
    .is("anonimizado_em", null)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}
