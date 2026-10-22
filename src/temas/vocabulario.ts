// Vocabulário do painel do dono por tema. Restaurantes e bares usam o padrão;
// um tema pode trocar palavras (ex.: pousada: visita → hospedagem, caixa → recepção).
import { temaDo, type IdTema } from "./config";

export type Termos = {
  /** palavra → substituta, aplicadas em ordem (expressões mais longas primeiro) */
  trocas: Record<string, string>;
  /** mostra os filtros e rótulos de morador/turista (pousada: só hóspedes) */
  mostrarPlanos: boolean;
  /** rótulo do campo de descrição ao registrar */
  descricao: string;
  /** exemplo no campo de nova mensagem */
  exemploMensagem: string;
};

export const TERMOS_PADRAO: Termos = {
  trocas: {},
  mostrarPlanos: true,
  descricao: "O que foi consumido",
  exemploMensagem: "Ex.: Hoje tem moqueca no almoço!",
};

const POR_TEMA: Partial<Record<IdTema, Partial<Termos>>> = {
  "sonhos-do-rosa": {
    trocas: {
      "no caixa": "na recepção",
      "do caixa": "da recepção",
      caixa: "recepção",
      "do restaurante": "da pousada",
      "o restaurante": "a pousada",
      restaurante: "pousada",
      Visitas: "Hospedagens",
      visitas: "hospedagens",
      Visita: "Hospedagem",
      visita: "hospedagem",
      Turistas: "Hóspedes",
      turistas: "hóspedes",
      Turista: "Hóspede",
      turista: "hóspede",
    },
    mostrarPlanos: false,
    descricao: "Detalhes da hospedagem (quarto, noites)",
    exemploMensagem: "Ex.: Temos datas livres no feriado. Reserve pelo WhatsApp!",
  },
};

export function termosDo(slug: string): Termos {
  return { ...TERMOS_PADRAO, ...POR_TEMA[temaDo(slug)] };
}

/** Aplica as trocas do tema num texto (palavras inteiras, respeitando acentos). */
export function traduzir(texto: string, termos: Termos): string {
  let t = texto;
  for (const [de, para] of Object.entries(termos.trocas)) {
    t = t.replace(new RegExp(`(?<!\\p{L})${de}(?!\\p{L})`, "gu"), para);
  }
  return t;
}
