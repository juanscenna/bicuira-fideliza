// Identidade visual de cada estabelecimento — definida AQUI no código, não no admin.
//
// Como adicionar o design de um restaurante novo:
//   1. crie a pasta src/temas/<id>/ com Moldura.tsx (página de cadastro e de cartão) e Cartao.tsx (o cartão)
//   2. registre o id em TEMAS (cores, logo e `faixa` — o cartão do Google Wallet igual ao cartão web)
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
  /** textos extras do cartão no Wallet (o título do cartão é sempre o nome do estabelecimento) */
  wallet?: { instagram?: string };
  /**
   * Logo no Google Wallet: o Google recorta a logo num círculo. A imagem é gerada quadrada (660 px) com a
   * logo centralizada sobre `cor_primaria`. `escala`: quanto da largura a logo ocupa (logo redonda: 1;
   * logo larga: ~0.75 para nada encostar na borda do círculo).
   */
  logoWallet?: { escala: number; fundo?: string };
  /**
   * OBRIGATÓRIO: visual da faixa de selos do Google Wallet (imagem de destaque), copiado do cartão web
   * do tema (mesmo fundo, mesmas cores do número, dos selos e da pílula "Faltam X"). Ver docs/ONBOARDING-ESTABELECIMENTO.md.
   */
  faixa: FaixaWallet;
};

/** Cores da faixa de selos do Google Wallet. Aceita cor ou degradê CSS (linear-/radial-gradient). */
export type FaixaWallet = {
  /** fundo da faixa (o mesmo do cartão web) */
  fundo: string;
  /** barra fina no topo (ex.: a faixa do sol da pousada) */
  barra: string;
  /** contador "3" e "/10" */
  numero: string;
  numeroMeta: string;
  /** pílula "Faltam 2 selos" / "Ganhou!" */
  pilula: string;
  textoPilula: string;
  /** contorno do selo ganho */
  aro: string;
  /** espaço do selo ainda não ganho */
  vazio: { fundo: string; borda: string; opacidadeSelo: number };
  /** último espaço vazio com o desenho de presente (como no cartão web) */
  presenteNoUltimo?: { cor: string; borda: string };
  /** texto da pílula em maiúsculas */
  maiusculas?: boolean;
};

export const TEMAS: Record<IdTema, ConfigTema> = {
  basico: {
    cor_primaria: "#111111",
    cor_secundaria: "#FFFFFF",
    logoUrl: null,
    faixa: {
      fundo: "#111111",
      barra: "#FFFFFF",
      numero: "#FFFFFF",
      numeroMeta: "rgba(255,255,255,0.6)",
      pilula: "#FFFFFF",
      textoPilula: "#111111",
      aro: "#FFFFFF",
      vazio: { fundo: "transparent", borda: "4px dashed rgba(255,255,255,0.3)", opacidadeSelo: 0.3 },
      maiusculas: true,
    },
  },
  // Comida Caseira Rosa Norte — preto, rosa da logo, amarelo do prato, creme das letras
  "rosa-norte": { cor_primaria: "#0A0A0A", cor_secundaria: "#E8115A", logoUrl: `${SITE_URL}/temas/rosa-norte/logo.png`, favicon: "/temas/rosa-norte/logo-256.png",
    selos: { feito: "/temas/rosa-norte/selo-160.png", vazio: "/temas/rosa-norte/selo-cinza-160.png" },
    badge: "/temas/rosa-norte/badge.png",
    wallet: { instagram: "comidacaseirarosa" },
    logoWallet: { escala: 1 }, // logo já é redonda
    faixa: {
      fundo: "radial-gradient(circle at 0% 0%, #3a0c1f 0%, #0A0A0A 60%)",
      barra: "#E8115A",
      numero: "#F2B315",
      numeroMeta: "rgba(255,255,255,0.6)",
      pilula: "#F2B315",
      textoPilula: "#0A0A0A",
      aro: "#E8115A",
      vazio: { fundo: "transparent", borda: "4px dashed rgba(255,255,255,0.3)", opacidadeSelo: 0.3 },
      maiusculas: true,
    },
  },
  // Pousada Sonhos do Rosa (Praia do Rosa, SC) — cores do site deles: laranja do sol, azul do mar, creme
  "sonhos-do-rosa": { cor_primaria: "#FDFAF4", cor_secundaria: "#E46A00", logoUrl: `${SITE_URL}/temas/sonhos-do-rosa/logo.png`, favicon: "/temas/sonhos-do-rosa/logo-256.png",
    selos: { feito: "/temas/sonhos-do-rosa/selo-160.png", vazio: "/temas/sonhos-do-rosa/selo-cinza-160.png" },
    badge: "/temas/sonhos-do-rosa/badge.png",
    wallet: { instagram: "sonhos_do_rosa" },
    // logo larga (sol + mar): centralizada, longe da borda do círculo; fundo branco porque a logo tem detalhes brancos
    logoWallet: { escala: 0.82, fundo: "#FFFFFF" },
    // igual ao cartão web (src/temas/sonhos-do-rosa/Cartao.tsx): branco, faixa do sol, número laranja, areia nos vazios
    faixa: {
      fundo: "#FFFFFC",
      barra: "linear-gradient(135deg, #EF8600, #DF5200)",
      numero: "#E46A00",
      numeroMeta: "#756657",
      pilula: "linear-gradient(135deg, #EF8600, #DF5200)",
      textoPilula: "#FFFFFF",
      aro: "#E46A00",
      vazio: { fundo: "#F3EAD9", borda: "3px dashed rgba(117,102,87,0.4)", opacidadeSelo: 0.4 },
      presenteNoUltimo: { cor: "#065DA0", borda: "4px solid #065DA0" },
    },
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
