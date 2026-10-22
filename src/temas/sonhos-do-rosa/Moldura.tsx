import type { CSSProperties } from "react";
import type { PropsMoldura } from "../tipos";
import { fonteSonhos, SONHOS } from "./estilo";
import { Sol } from "./Sol";

/** Pousada Sonhos do Rosa: fundo preto, logo grande, conteúdo numa "folha" creme. */
export function MolduraSonhosDoRosa({ estab, children }: PropsMoldura) {
  const cores = {
    "--estab-primaria": SONHOS.preto,
    "--estab-texto-primaria": SONHOS.creme,
    "--estab-secundaria": SONHOS.azul,
    "--estab-texto-secundaria": "#FFFFFF",
  } as CSSProperties;

  return (
    <div style={cores} className={`${fonteSonhos.variable} flex min-h-dvh flex-col bg-[#2F2115] font-[family-name:var(--fonte-sonhos)] text-[#2F2115]`}>
      <header className="relative flex flex-col items-center overflow-hidden px-5 pt-10 pb-16 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/temas/sonhos-do-rosa/salao-800.webp" alt="" className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(47,33,21,0.35),rgba(47,33,21,0.85))]" />
        <Sol className="absolute top-6 left-5 size-9 text-[#E46A00]" />
        <Sol className="absolute top-6 right-5 size-9 text-[#E46A00]" />
        {estab.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={estab.logoUrl} alt={estab.nome} className="relative size-36 rounded-full shadow-[0_0_0_4px_#065DA0,0_16px_40px_rgba(6,93,160,0.5)]" />
        ) : (
          <p className="relative text-3xl font-black uppercase text-[#FDFAF4]">{estab.nome}</p>
        )}
      </header>
      <main className="-mt-8 flex-1 rounded-t-[2.5rem] bg-[#FDFAF4] px-5 pt-8 pb-10">
        <div className="mx-auto w-full max-w-md">{children}</div>
      </main>
      <footer className="bg-[#FDFAF4] px-5 pb-6 text-center text-[11px] font-bold uppercase tracking-[0.25em] text-[#2F2115]/60">
        por Bicuíra Digital
      </footer>
    </div>
  );
}
