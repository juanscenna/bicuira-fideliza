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
