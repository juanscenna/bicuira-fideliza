// Tipo de aparelho no navegador (só no cliente). Usado para escolher Apple ou Google Wallet.
//
// Atenção: tablets Android (ex.: Samsung) abrem os sites em "modo computador" por padrão e se apresentam
// como Linux, sem a palavra "Android". iPad faz o mesmo e se apresenta como Mac. Por isso a tela de toque
// também conta.

export type Aparelho = "ios" | "android" | "outro";

type Navegador = Pick<Navigator, "userAgent" | "maxTouchPoints"> & { userAgentData?: { platform?: string; mobile?: boolean } };

export function detectarAparelho(nav: Navegador = navigator): Aparelho {
  const ua = nav.userAgent;
  const toque = nav.maxTouchPoints > 1;
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && toque)) return "ios";
  if (/Android/i.test(ua) || nav.userAgentData?.platform === "Android" || nav.userAgentData?.mobile) return "android";
  // Android em "modo computador": Linux com tela de toque (computador Linux comum não tem toque)
  if (/Linux|X11/i.test(ua) && nav.maxTouchPoints > 0) return "android";
  return "outro";
}
