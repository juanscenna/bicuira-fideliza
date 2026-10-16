import type { ReactNode } from "react";
import { MOLDURAS } from "@/temas/molduras";
import type { EstabelecimentoPublico } from "@/lib/publico";

/** Página pública no design do tema do estabelecimento (src/temas). */
export function MolduraPublica({ estab, children }: { estab: EstabelecimentoPublico; children: ReactNode }) {
  const Moldura = MOLDURAS[estab.tema];
  return <Moldura estab={{ nome: estab.nome, logoUrl: estab.logoUrl }}>{children}</Moldura>;
}
