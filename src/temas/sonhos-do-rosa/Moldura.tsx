import type { CSSProperties } from "react";
import type { PropsMoldura } from "../tipos";
import { fonteSonhos, SONHOS } from "./estilo";

/** Pousada Sonhos do Rosa: foto da praia com a logo, conteúdo numa folha creme (como o site). */
export function MolduraSonhosDoRosa({ estab, children }: PropsMoldura) {
  const cores = {
    "--estab-primaria": SONHOS.sol,
    "--estab-texto-primaria": "#FFFFFF",
    "--estab-secundaria": SONHOS.mar,
    "--estab-texto-secundaria": "#FFFFFF",
  } as CSSProperties;

  return (
    <div style={cores} className={`${fonteSonhos.variable} flex min-h-dvh flex-col bg-[#FDFAF4] font-[family-name:var(--fonte-sonhos)] text-[#2F2115]`}>
      <header className="relative flex flex-col items-center overflow-hidden px-5 pt-10 pb-16 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/temas/sonhos-do-rosa/salao-800.webp" alt="" className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(47,33,21,0.2),rgba(47,33,21,0.7))]" />
        {estab.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={estab.logoUrl} alt={estab.nome} className="relative h-24 w-auto drop-shadow-lg" />
        ) : (
          <p className="relative text-3xl font-semibold tracking-tight text-[#FDFAF4]">{estab.nome}</p>
        )}
      </header>
      <main className="-mt-8 flex-1 rounded-t-[2rem] bg-[#FDFAF4] px-5 pt-8 pb-10">
        <div className="mx-auto w-full max-w-md">{children}</div>
      </main>
      <footer className="bg-[#FDFAF4] px-5 pb-6 text-center text-[11px] font-semibold uppercase tracking-[0.25em] text-[#756657]">
        por Bicuíra Digital
      </footer>
    </div>
  );
}
