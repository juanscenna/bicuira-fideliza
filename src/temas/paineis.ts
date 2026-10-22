import { fonteRosa } from "./rosa-norte/estilo";
import { fonteSonhos } from "./sonhos-do-rosa/estilo";
import type { IdTema } from "./config";

/** Visual do painel do dono por tema. A classe troca as cores da Bicuíra pelas do restaurante (globals.css). */
export type TemaPainel = { classe: string; logoUrl: string; foto: string; faixa?: string[] };

export const PAINEIS: Partial<Record<IdTema, TemaPainel>> = {
  "rosa-norte": {
    classe: `${fonteRosa.variable} tema-rosa-norte`,
    logoUrl: "/temas/rosa-norte/logo-256.png",
    foto: "/temas/rosa-norte/salao-800.webp",
    faixa: ["Comida caseira", "Rosa Norte", "Cartão fidelidade", "Junte selos"],
  },
  "sonhos-do-rosa": {
    classe: `${fonteSonhos.variable} tema-sonhos-do-rosa`,
    logoUrl: "/temas/sonhos-do-rosa/logo-256.png",
    foto: "/temas/sonhos-do-rosa/salao-800.webp",
    faixa: ["Pousada", "Sonhos do Rosa", "Cartão fidelidade", "Junte selos"],
  },
};
