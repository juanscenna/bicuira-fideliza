import type { CSSProperties } from "react";
import { Sol } from "./Sol";

/** Etiqueta em pílula, como os selos do site da pousada (levemente inclinada, flutuando). */
export function Adesivo({ children, className, giro }: { children: React.ReactNode; className: string; giro: string }) {
  return (
    <span
      style={{ "--giro": giro } as CSSProperties}
      className={`absolute z-10 inline-flex items-center justify-center font-semibold leading-none shadow-[0_18px_40px_-24px_rgba(94,70,48,0.6)] motion-safe:animate-[flutuar_5s_ease-in-out_infinite] ${className}`}
    >
      {children}
    </span>
  );
}

const FAIXA = ["Pousada Sonhos do Rosa", "Praia do Rosa", "Cartão fidelidade", "Junte selos"];

/** Faixa areia correndo, reta (cadastro e cartão), no tom das seções do site. */
export function Faixa({ itens = FAIXA }: { itens?: string[] }) {
  return (
    <div className="relative z-10 mb-14 overflow-hidden border-y border-[#E4DDCF] bg-[#F3EAD9] py-4 text-[#2F2115]" aria-hidden>
      <div className="flex w-max gap-8 motion-safe:animate-[faixa_24s_linear_infinite]">
        {[...itens, ...itens, ...itens, ...itens].map((t, i) => (
          <span key={i} className="flex items-center gap-8 text-lg font-semibold tracking-tight whitespace-nowrap lg:text-xl">
            {t}
            <Sol className="size-5 text-[#E46A00]" />
          </span>
        ))}
      </div>
    </div>
  );
}
