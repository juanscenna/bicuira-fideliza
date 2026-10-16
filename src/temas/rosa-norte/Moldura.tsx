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
      <header className="relative flex flex-col items-center px-5 pt-8 pb-14 text-center">
        <Rosa className="absolute top-10 left-5 size-9 text-[#E8115A] opacity-80" />
        <Rosa className="absolute top-10 right-5 size-9 text-[#E8115A] opacity-80" />
        {estab.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={estab.logoUrl} alt={estab.nome} className="size-40 rounded-full shadow-[0_0_0_4px_#E8115A]" />
        ) : (
          <p className="text-3xl font-black uppercase text-[#F3EEE5]">{estab.nome}</p>
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
