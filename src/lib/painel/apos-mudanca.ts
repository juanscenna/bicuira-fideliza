import "server-only";
import { after } from "next/server";
import { avisarCartoes } from "@/lib/tempo-real-servidor";
import { atualizarWallet } from "@/lib/wallet";

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
 * A etapa 7 acrescenta as notificações automáticas.
 */
export async function aposMudanca(estado: EstadoOperacao) {
  await avisarCartoes([estado.token]);
  after(() => atualizarWallet(estado.cliente_id));
}
