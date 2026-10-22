import { fonteRosa } from "./rosa-norte/estilo";
import { fonteSonhos } from "./sonhos-do-rosa/estilo";
import type { IdTema } from "./config";

/** Visual do painel do dono por tema. A classe troca as cores da Bicuíra pelas do restaurante (globals.css). */
export type TemaPainel = {
  classe: string;
  logoUrl: string;
  foto: string;
  faixa?: string[];
  /** classes da logo no topo (padrão: redonda com contorno, como a Rosa Norte) */
  logoClasse?: string;
  /** classes da etiqueta acima do nome (padrão: adesivo girado, como a Rosa Norte) */
  etiquetaClasse?: string;
};

export const PAINEIS: Partial<Record<IdTema, TemaPainel>> = {
  "rosa-norte": {
    classe: `${fonteRosa.variable} tema-rosa-norte`,
    logoUrl: "/temas/rosa-norte/logo-256.png",
    foto: "/temas/rosa-norte/salao-800.webp",
    faixa: ["Comida caseira", "Rosa Norte", "Cartão fidelidade", "Junte selos"],
  },
  "sonhos-do-rosa": {
    classe: `${fonteSonhos.variable} tema-sonhos-do-rosa`,
    logoUrl: "/temas/sonhos-do-rosa/logo.png",
    logoClasse: "h-14 w-auto shrink-0 drop-shadow-lg md:h-16",
    etiquetaClasse: "mb-1 inline-block rounded-full bg-[#FDFAF4] px-3 py-1 text-xs font-semibold text-[#2F2115]",
    foto: "/temas/sonhos-do-rosa/salao-800.webp",
    faixa: ["Pousada Sonhos do Rosa", "Praia do Rosa", "Cartão fidelidade", "Junte selos"],
  },
};
