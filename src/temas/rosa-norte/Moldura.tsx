import type { CSSProperties } from "react";
import type { PropsMoldura } from "../tipos";
import { fonteRosa, ROSA } from "./estilo";
import { Rosa } from "./Rosa";

/** Comida Caseira Rosa Norte: fundo preto, logo grande, conteúdo numa "folha" creme. */
export function MolduraRosaNorte({ estab, children }: PropsMoldura) {
  const cores = {
    "--estab-primaria": ROSA.preto,
    "--estab-texto-primaria": ROSA.creme,
    "--estab-secundaria": ROSA.rosa,
    "--estab-texto-secundaria": "#FFFFFF",
  } as CSSProperties;

  return (
    <div style={cores} className={`${fonteRosa.variable} flex min-h-dvh flex-col bg-[#0A0A0A] font-[family-name:var(--fonte-rosa)] text-[#0A0A0A]`}>
      <header className="relative flex flex-col items-center overflow-hidden px-5 pt-10 pb-16 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/temas/rosa-norte/salao-800.webp" alt="" className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,10,10,0.35),rgba(10,10,10,0.85))]" />
        <Rosa className="absolute top-6 left-5 size-9 text-[#E8115A]" />
        <Rosa className="absolute top-6 right-5 size-9 text-[#E8115A]" />
        {estab.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={estab.logoUrl} alt={estab.nome} className="relative size-36 rounded-full shadow-[0_0_0_4px_#E8115A,0_16px_40px_rgba(232,17,90,0.5)]" />
        ) : (
          <p className="relative text-3xl font-black uppercase text-[#F3EEE5]">{estab.nome}</p>
        )}
      </header>
      <main className="-mt-8 flex-1 rounded-t-[2.5rem] bg-[#F3EEE5] px-5 pt-8 pb-10">
        <div className="mx-auto w-full max-w-md">{children}</div>
      </main>
      <footer className="bg-[#F3EEE5] px-5 pb-6 text-center text-[11px] font-bold uppercase tracking-[0.25em] text-[#0A0A0A]/60">
        por Bicuíra Digital
      </footer>
    </div>
  );
}
