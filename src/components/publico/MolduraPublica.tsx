import type { CSSProperties, ReactNode } from "react";
import { variaveisTema } from "@/lib/tema";
import type { EstabelecimentoPublico } from "@/lib/publico";

/** Página pública com o tema do estabelecimento: faixa com logo e nome, conteúdo neutro, rodapé discreto. */
export function MolduraPublica({ estab, children }: { estab: EstabelecimentoPublico; children: ReactNode }) {
  return (
    <div style={variaveisTema(estab) as CSSProperties} className="flex min-h-dvh flex-col bg-neutral-50 text-neutral-900">
      <header className="bg-[var(--estab-primaria)] px-5 pt-6 pb-5 text-[var(--estab-texto-primaria)]">
        <div className="mx-auto flex max-w-md items-center gap-3">
          {estab.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={estab.logoUrl} alt="" className="size-12 rounded-xl bg-white object-contain" />
          ) : (
            <span
              aria-hidden
              className="flex size-12 items-center justify-center rounded-xl bg-[var(--estab-secundaria)] text-xl font-bold text-[var(--estab-texto-secundaria)]"
            >
              {estab.nome.slice(0, 1).toUpperCase()}
            </span>
          )}
          <p className="text-xl font-bold leading-tight">{estab.nome}</p>
        </div>
      </header>
      <main className="mx-auto w-full max-w-md flex-1 px-5 py-6">{children}</main>
      <footer className="px-5 pb-6 text-center text-sm text-neutral-600">por Bicuíra Digital</footer>
    </div>
  );
}
