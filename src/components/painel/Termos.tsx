"use client";

import { createContext, useContext, type ReactNode } from "react";
import { TERMOS_PADRAO, traduzir, type Termos } from "@/temas/vocabulario";

const Contexto = createContext<Termos>(TERMOS_PADRAO);

/** Vocabulário do tema para os componentes do painel (ver src/temas/vocabulario.ts). */
export function ProvedorTermos({ termos, children }: { termos: Termos; children: ReactNode }) {
  return <Contexto.Provider value={termos}>{children}</Contexto.Provider>;
}

/** `t("Registrar visita")` devolve o texto no vocabulário do estabelecimento. */
export function useTermos() {
  const termos = useContext(Contexto);
  return { termos, t: (texto: string) => traduzir(texto, termos) };
}
