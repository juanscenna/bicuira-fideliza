import type { CSSProperties } from "react";
import type { PropsMoldura } from "../tipos";

/**
 * Tema básico (preto e branco): página de cadastro, cartão e política.
 * As variáveis --estab-* são usadas pelo formulário de cadastro (botões, foco).
 */
export function MolduraBasico({ estab, children }: PropsMoldura) {
  const cores = {
    "--estab-primaria": "#111111",
    "--estab-texto-primaria": "#FFFFFF",
    "--estab-secundaria": "#FFFFFF",
    "--estab-texto-secundaria": "#111111",
  } as CSSProperties;

  return (
    <div style={cores} className="flex min-h-dvh flex-col bg-white text-[#111]">
      <header className="border-b-4 border-[#111] px-5 pt-8 pb-5">
        <div className="mx-auto flex max-w-md items-center gap-3">
          {estab.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={estab.logoUrl} alt="" className="size-12 object-contain" />
          ) : (
            <span aria-hidden className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#111] text-2xl font-black text-white">
              {estab.nome.slice(0, 1).toUpperCase()}
            </span>
          )}
          <p className="text-2xl font-black uppercase leading-none tracking-tight">{estab.nome}</p>
        </div>
      </header>
      <main className="mx-auto w-full max-w-md flex-1 px-5 py-6">{children}</main>
      <footer className="px-5 pb-6 text-center text-xs font-semibold uppercase tracking-[0.2em] text-[#111]/60">por Bicuíra Digital</footer>
    </div>
  );
}
