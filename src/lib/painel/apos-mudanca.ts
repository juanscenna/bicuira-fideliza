import "server-only";
import { avisarCartoes } from "@/lib/tempo-real-servidor";

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
 * Depois de qualquer mudança no cartão: avisa o cartão web aberto (tempo real).
 * Etapa 6 acrescenta a atualização do Apple/Google Wallet; etapa 7, as notificações automáticas.
 */
export async function aposMudanca(estado: EstadoOperacao) {
  await avisarCartoes([estado.token]);
}
