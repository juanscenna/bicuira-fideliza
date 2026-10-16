import type { CSSProperties } from "react";
import { Rosa } from "./Rosa";

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

const FAIXA = ["Comida caseira", "Rosa Norte", "Cartão fidelidade", "Junte selos"];

/** Faixa amarela correndo, inclinada (cadastro e cartão). */
export function Faixa({ itens = FAIXA }: { itens?: string[] }) {
  return (
    <div className="relative z-10 mb-14 -rotate-2 overflow-hidden border-y-4 border-[#0A0A0A] bg-[#F2B315] py-3 text-[#0A0A0A]" aria-hidden>
      <div className="flex w-max gap-8 motion-safe:animate-[faixa_18s_linear_infinite]">
        {[...itens, ...itens, ...itens, ...itens].map((t, i) => (
          <span key={i} className="flex items-center gap-8 text-xl font-black uppercase whitespace-nowrap lg:text-2xl">
            {t}
            <Rosa className="size-6 text-[#E8115A]" />
          </span>
        ))}
      </div>
    </div>
  );
}
