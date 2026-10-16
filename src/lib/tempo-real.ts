// Canal de tempo real do cartão web. O nome do canal é um hash do token secreto:
// só quem tem o link do cartão consegue escutar, e o token não circula pelo Realtime.
// Pelo canal passa apenas o aviso "atualizou"; os dados são buscados pela rota do cartão.

export const EVENTO_ATUALIZOU = "atualizou";

export async function canalDoCartao(token: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`cartao:${token}`));
  const hex = Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
  return `cartao-${hex.slice(0, 40)}`;
}
