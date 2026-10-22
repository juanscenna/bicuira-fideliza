// Vocabulário do painel do dono por tema. Restaurantes e bares usam o padrão;
// um tema pode trocar palavras (ex.: pousada: visita → hospedagem, caixa → recepção).
import { AUTOMATICAS, textoAutomatico, type TipoAutomatica } from "@/lib/notificacoes/regras";
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
  /**
   * avisos automáticos com textos próprios do negócio. No `texto`, use {recompensa}, {carimbos} e {meta}.
   * O que não for definido aqui usa o padrão de restaurante, com as `trocas` aplicadas.
   */
  automaticas: Partial<Record<TipoAutomatica, { titulo?: string; quando?: string; texto?: string }>>;
};

export const TERMOS_PADRAO: Termos = {
  trocas: {},
  mostrarPlanos: true,
  descricao: "O que foi consumido",
  exemploMensagem: "Ex.: Hoje tem moqueca no almoço!",
  automaticas: {},
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
    automaticas: {
      falta_pouco: {
        quando: "Quando o hóspede fica a 1 selo da recompensa.",
        texto: "Falta só 1 hospedagem para você ganhar {recompensa}! Esperamos você de volta na Praia do Rosa.",
      },
      recompensa_disponivel: {
        quando: "Quando o cartão completa.",
        texto: "Cartão completo! Na sua próxima hospedagem, mostre o cartão na recepção para ganhar {recompensa}.",
      },
      sentimos_falta: {
        titulo: "Saudades da Praia do Rosa",
        quando: "Quando o hóspede passa do limite de dias sem se hospedar (se houver limite). Uma vez por período, enviada de dia, em horário comercial.",
        texto: "Sentimos sua falta na Praia do Rosa! Seus selos continuam guardados: {carimbos} de {meta}. Que tal planejar a próxima estadia?",
      },
      recompensa_esquecida: {
        titulo: "Recompensa guardada",
        quando: "Quando a recompensa está disponível há mais de 15 dias sem resgate.",
        texto: "Sua recompensa ({recompensa}) está guardada para a sua próxima hospedagem. É só mostrar o cartão na recepção.",
      },
    },
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

/** Título e explicação de um aviso automático no vocabulário do tema (painel). */
export function automaticaDo(tipo: TipoAutomatica, termos: Termos) {
  const proprio = termos.automaticas[tipo];
  return {
    titulo: proprio?.titulo ?? traduzir(AUTOMATICAS[tipo].titulo, termos),
    quando: proprio?.quando ?? traduzir(AUTOMATICAS[tipo].quando, termos),
  };
}

/** Texto do aviso automático que vai para o cliente, no vocabulário do tema. */
export function textoAutomaticoDo(tipo: TipoAutomatica, c: { recompensa: string; carimbos: number; meta: number }, termos: Termos) {
  const modelo = termos.automaticas[tipo]?.texto;
  if (!modelo) return traduzir(textoAutomatico(tipo, c), termos);
  return modelo.replaceAll("{recompensa}", c.recompensa).replaceAll("{carimbos}", String(c.carimbos)).replaceAll("{meta}", String(c.meta));
}
