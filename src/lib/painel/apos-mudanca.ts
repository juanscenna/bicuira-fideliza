import "server-only";
import { after } from "next/server";
import { avisarCartoes } from "@/lib/tempo-real-servidor";
import { atualizarWallet } from "@/lib/wallet";
import { automaticasDaOperacao } from "@/lib/notificacoes/automaticas";

export type EstadoOperacao = {
  cliente_id: string;
  nome: string;
  carimbos: number;
  meta: number;
  recompensa: string;
  recompensa_disponivel: boolean;
  plano: "morador" | "turista";
  token: string;
  visita_id?: string;
  evento_id?: string;
  gerou_carimbo?: boolean;
  motivo?: "abaixo_minimo" | "cartao_cheio" | null;
  completou?: boolean;
  falta_um?: boolean;
  aviso?: "resgate_posterior" | "cartao_cheio" | null;
  delta?: number;
  recompensa_entregue?: string;
};

/**
 * Depois de qualquer mudança no cartão:
 *  1. avisa o cartão web aberto (tempo real), na hora;
 *  2. atualiza Apple/Google Wallet depois de responder ao painel (não atrasa o caixa).
 *  3. dispara "falta pouco" / "recompensa disponível", se estiverem ligadas.
 */
export async function aposMudanca(estabelecimentoId: string, estado: EstadoOperacao) {
  await avisarCartoes([estado.token]);
  after(async () => {
    await atualizarWallet(estado.cliente_id);
    await automaticasDaOperacao(estabelecimentoId, estado).catch((e) => console.error("[automáticas]", e));
  });
}
