// Identidade visual de cada estabelecimento — definida AQUI no código, não no admin.
//
// Como adicionar o design de um restaurante novo:
//   1. crie a pasta src/temas/<id>/ com Moldura.tsx (página de cadastro e de cartão) e Cartao.tsx (o cartão)
//   2. registre o id em TEMAS (cores e logo, usadas também no ícone, no manifest e no Wallet)
//   3. registre os componentes em src/temas/molduras.tsx e src/temas/cartoes.tsx
//   4. ligue o endereço (slug) do estabelecimento ao tema em TEMA_POR_SLUG
// Estabelecimentos sem tema próprio usam o "basico" (preto e branco).

export type IdTema = "basico";

export type ConfigTema = {
  /** cor de fundo do cartão / cabeçalho (também usada no Wallet e no ícone) */
  cor_primaria: string;
  /** cor de apoio (faixa de carimbos no Wallet) */
  cor_secundaria: string;
  /** logo pública (arquivo em /public/temas/<id>/...), ou null para usar a inicial do nome */
  logoUrl: string | null;
};

export const TEMAS: Record<IdTema, ConfigTema> = {
  basico: { cor_primaria: "#111111", cor_secundaria: "#FFFFFF", logoUrl: null },
};

/** endereço do estabelecimento → tema. Ex.: "bar-do-ze": "bar-do-ze" */
const TEMA_POR_SLUG: Record<string, IdTema> = {};

export function temaDo(slug: string): IdTema {
  return TEMA_POR_SLUG[slug] ?? "basico";
}
