import "server-only";
import { avisarAparelhosApple } from "./apple";
import { walletVisivel } from "./config";
import { dadosPorCliente } from "./dados";
import { atualizarObjetoGoogle } from "./google";

/**
 * Atualiza o cartão do cliente no Apple Wallet (push → o iPhone busca a versão nova)
 * e no Google Wallet (PATCH do objeto). Sem credenciais, só registra em log.
 */
export async function atualizarWallet(clienteId: string) {
  if (!walletVisivel()) return; // piloto só com cartão web
  const d = await dadosPorCliente(clienteId);
  if (!d) return;
  await Promise.allSettled([avisarAparelhosApple(d.serial), atualizarObjetoGoogle(d)]).then((r) =>
    r.forEach((x) => x.status === "rejected" && console.error("[wallet]", x.reason)),
  );
}

/** Atualiza todos os cartões de um estabelecimento (ex.: mudou logo, cor ou regras). */
export async function atualizarWalletDoEstabelecimento(clienteIds: string[]) {
  for (const id of clienteIds) await atualizarWallet(id);
}
