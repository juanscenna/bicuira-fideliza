import { fonteRosa } from "./rosa-norte/estilo";
import type { IdTema } from "./config";

/** Visual do painel do dono por tema. A classe troca as cores da Bicuíra pelas do restaurante (globals.css). */
export type TemaPainel = { classe: string; logoUrl: string; foto: string };

export const PAINEIS: Partial<Record<IdTema, TemaPainel>> = {
  "rosa-norte": {
    classe: `${fonteRosa.variable} tema-rosa-norte`,
    logoUrl: "/temas/rosa-norte/logo-256.png",
    foto: "/temas/rosa-norte/salao-800.webp",
  },
};
