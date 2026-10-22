import type { CSSProperties } from "react";
import { Sol } from "./Sol";

/** Adesivo no estilo "colado" da identidade (texto curto, girado). */
export function Adesivo({ children, className, giro }: { children: React.ReactNode; className: string; giro: string }) {
  return (
    <span
      style={{ "--giro": giro } as CSSProperties}
      className={`absolute z-10 inline-flex items-center justify-center font-black uppercase leading-none shadow-[0_6px_0_rgba(0,0,0,0.35)] motion-safe:animate-[flutuar_5s_ease-in-out_infinite] ${className}`}
    >
      {children}
    </span>
  );
}

const FAIXA = ["Pousada", "Sonhos do Rosa", "Cartão fidelidade", "Junte selos"];

/** Faixa amarela correndo, reta (cadastro e cartão). */
export function Faixa({ itens = FAIXA }: { itens?: string[] }) {
  return (
    <div className="relative z-10 mb-14 overflow-hidden border-y-4 border-[#2F2115] bg-[#E46A00] py-3 text-[#2F2115]" aria-hidden>
      <div className="flex w-max gap-8 motion-safe:animate-[faixa_18s_linear_infinite]">
        {[...itens, ...itens, ...itens, ...itens].map((t, i) => (
          <span key={i} className="flex items-center gap-8 text-xl font-black uppercase whitespace-nowrap lg:text-2xl">
            {t}
            <Sol className="size-6 text-[#E46A00]" />
          </span>
        ))}
      </div>
    </div>
  );
}
