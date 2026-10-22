// Identidade visual de cada estabelecimento — definida AQUI no código, não no admin.
//
// Como adicionar o design de um restaurante novo:
//   1. crie a pasta src/temas/<id>/ com Moldura.tsx (página de cadastro e de cartão) e Cartao.tsx (o cartão)
//   2. registre o id em TEMAS (cores e logo, usadas também no ícone, no manifest e no Wallet)
//   3. registre os componentes em src/temas/molduras.tsx e src/temas/cartoes.tsx
//   4. ligue o endereço (slug) do estabelecimento ao tema em TEMA_POR_SLUG
// Estabelecimentos sem tema próprio usam o "basico" (preto e branco).

import { SITE_URL } from "@/lib/env";

export type IdTema = "basico" | "rosa-norte" | "sonhos-do-rosa";

export type ConfigTema = {
  /** cor de fundo do cartão / cabeçalho (também usada no Wallet e no ícone) */
  cor_primaria: string;
  /** cor de apoio (faixa de carimbos no Wallet) */
  cor_secundaria: string;
  /** logo pública (arquivo em /public/temas/<id>/...), ou null para usar a inicial do nome */
  logoUrl: string | null;
  /** ícone da aba do navegador (logo pequena); sem ele, usa o ícone gerado em /<slug>/icone */
  favicon?: string;
  /** selo do cartão no Wallet (PNG, caminho público): ganho e ainda não ganho. Sem ele, bolinhas na cor de apoio. */
  selos?: { feito: string; vazio: string };
  /** ícone pequeno das notificações (Android): branco com fundo transparente */
  badge?: string;
  /** textos extras do cartão no Wallet */
  wallet?: { titulo?: string; instagram?: string };
};

export const TEMAS: Record<IdTema, ConfigTema> = {
  basico: { cor_primaria: "#111111", cor_secundaria: "#FFFFFF", logoUrl: null },
  // Comida Caseira Rosa Norte — preto, rosa da logo, amarelo do prato, creme das letras
  "rosa-norte": { cor_primaria: "#0A0A0A", cor_secundaria: "#E8115A", logoUrl: `${SITE_URL}/temas/rosa-norte/logo.png`, favicon: "/temas/rosa-norte/logo-256.png",
    selos: { feito: "/temas/rosa-norte/selo-160.png", vazio: "/temas/rosa-norte/selo-cinza-160.png" },
    badge: "/temas/rosa-norte/badge.png",
    wallet: { titulo: "Junte selos. Ganhe recompensas.", instagram: "comidacaseirarosa" },
  },
  // Pousada Sonhos do Rosa (Praia do Rosa, SC) — preto-marrom, azul do mar, laranja do sol, creme
  "sonhos-do-rosa": { cor_primaria: "#2F2115", cor_secundaria: "#065DA0", logoUrl: `${SITE_URL}/temas/sonhos-do-rosa/logo.png`, favicon: "/temas/sonhos-do-rosa/logo-256.png",
    selos: { feito: "/temas/sonhos-do-rosa/selo-160.png", vazio: "/temas/sonhos-do-rosa/selo-cinza-160.png" },
    badge: "/temas/sonhos-do-rosa/badge.png",
    wallet: { titulo: "Junte selos. Ganhe recompensas." },
  },
};

/** endereço do estabelecimento → tema. Ex.: "bar-do-ze": "bar-do-ze" */
const TEMA_POR_SLUG: Record<string, IdTema> = {
  comidacaseirarosanorte: "rosa-norte",
  "comida-caseira-rosa-norte": "rosa-norte",
  pousadasonhosdorosa: "sonhos-do-rosa",
};

export function temaDo(slug: string): IdTema {
  return TEMA_POR_SLUG[slug] ?? "basico";
}

/** Ícones (aba do navegador + tela inicial do iPhone) de um estabelecimento. */
export function iconesDo(slug: string) {
  const fav = TEMAS[temaDo(slug)].favicon;
  return {
    icon: fav ? [{ url: fav, type: "image/png" }] : [{ url: `/${slug}/icone/192`, type: "image/png" }],
    apple: `/${slug}/icone/180`,
  };
}

/** Ícone grande (logo) e pequeno (silhueta) das notificações do site. */
export function iconesPushDo(slug: string, base: string) {
  const t = TEMAS[temaDo(slug)];
  return { icone: `${base}${iconesDo(slug).icon[0].url}`, badge: t.badge ? `${base}${t.badge}` : undefined };
}
