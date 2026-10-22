"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Selo } from "./Selo";

const META = 10;
// começa devagar e acelera até completar; depois uma pausa para ver a recompensa
const ESPERA_MS = [1100, 950, 800, 650, 520, 420, 340, 280, 230, 210];
const PAUSA_COMPLETO_MS = 3200;

function useMovimentoReduzido() {
  return useSyncExternalStore(
    (avisar) => {
      const m = window.matchMedia("(prefers-reduced-motion: reduce)");
      m.addEventListener("change", avisar);
      return () => m.removeEventListener("change", avisar);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

/**
 * Cartão de demonstração: gira em 3D, com brilho e luz, ganhando selos (começa devagar e acelera).
 * Ao completar, dá uma volta inteira, mostra "Recompensa liberada!" e recomeça.
 * Não mostra regras de plano (o cliente escolhe o plano sem ver as recompensas).
 */
export function CartaoDemo({ logoUrl }: { logoUrl: string | null }) {
  const reduzido = useMovimentoReduzido();
  const [passo, setPasso] = useState(0);
  const caixa = useRef<HTMLDivElement>(null);
  const [visivel, setVisivel] = useState(true);

  // fora da tela: pausa tudo (economiza bateria e não pesa ao rolar)
  useEffect(() => {
    const el = caixa.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(([e]) => setVisivel(e.isIntersecting), { rootMargin: "100px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (reduzido || !visivel) return;
    const espera = passo >= META ? PAUSA_COMPLETO_MS : ESPERA_MS[passo];
    const t = setTimeout(() => setPasso((p) => (p >= META ? 0 : p + 1)), espera);
    return () => clearTimeout(t);
  }, [reduzido, visivel, passo]);

  const carimbos = reduzido ? 7 : Math.min(passo, META);
  const completo = !reduzido && passo >= META;

  return (
    <div
      ref={caixa}
      className={`relative isolate mx-auto w-full max-w-[360px] py-8 [perspective:1100px] ${visivel ? "" : "[&_*]:[animation-play-state:paused]"}`}
      aria-hidden
    >
      {/* luzes atrás do cartão */}
      {/* luzes feitas com gradiente (sem blur): leves em qualquer celular */}
      <div className="absolute -inset-x-6 inset-y-0 bg-[radial-gradient(closest-side,rgba(6,93,160,0.85),rgba(6,93,160,0.35)_55%,transparent)] motion-safe:animate-[pulsar_3.2s_ease-in-out_infinite]" />
      <div className="absolute -top-6 -right-6 size-44 bg-[radial-gradient(closest-side,rgba(228,106,0,0.6),transparent)] motion-safe:animate-[pulsar_4s_ease-in-out_infinite_1s]" />

      <div className="relative [transform-style:preserve-3d] will-change-transform motion-safe:animate-[balanco3d_7s_ease-in-out_infinite]">
        <div
          key={completo ? "giro" : "parado"}
          className={`relative aspect-[1.58/1] w-full [transform-style:preserve-3d] ${completo ? "animate-[giro360_1.4s_cubic-bezier(.6,0,.3,1)]" : ""}`}
        >
          {/* frente */}
          <div className="absolute inset-0 overflow-hidden rounded-[1.6rem] border-[3px] border-[#065DA0] bg-[radial-gradient(120%_120%_at_0%_0%,#3D2E20_0%,#2F2115_55%)] p-4 shadow-[0_30px_60px_-20px_rgba(6,93,160,0.7)] [backface-visibility:hidden]">
            <div className="flex items-center gap-2">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="" className="size-10 rounded-full" />
              ) : null}
              <div className="leading-none">
                <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#FDFAF4]/80">Cartão fidelidade</p>
                <p className="text-lg font-black uppercase text-[#065DA0]">Sonhos do Rosa</p>
              </div>
              <p className="ml-auto text-2xl font-black tabular-nums text-[#E46A00]">
                {carimbos}
                <span className="text-sm text-[#FDFAF4]/60">/{META}</span>
              </p>
            </div>
            <ol className="mt-3 grid grid-cols-5 gap-2">
              {Array.from({ length: META }, (_, i) => {
                const feito = i < carimbos;
                const novo = !reduzido && i === carimbos - 1 && !completo;
                return (
                  <li key={i} className="relative flex justify-center">
                    <span
                      className={`flex aspect-square w-full max-w-10 items-center justify-center rounded-full ${
                        feito ? "shadow-[0_0_0_2px_#065DA0,0_0_14px_rgba(6,93,160,0.9)]" : "outline-2 outline-dashed outline-[#FDFAF4]/25"
                      } ${novo ? "animate-[carimbo_600ms_ease-out]" : ""}`}
                    >
                      <Selo feito={feito} />
                    </span>
                    {novo ? <span className="absolute inset-0 m-auto size-6 rounded-full bg-[#E46A00] animate-[faisca_700ms_ease-out_forwards]" /> : null}
                  </li>
                );
              })}
            </ol>
            {completo ? (
              <p className="absolute inset-x-4 bottom-3 rounded-xl bg-[#E46A00] py-1.5 text-center text-sm font-black uppercase text-[#2F2115]">
                Recompensa liberada!
              </p>
            ) : null}
            {/* brilho holográfico passando */}
            <div className="pointer-events-none absolute inset-y-0 -left-full w-[300%] bg-[linear-gradient(115deg,transparent_42%,rgba(255,255,255,0.28)_49%,rgba(228,106,0,0.16)_51%,transparent_58%)] motion-safe:animate-[brilho_3.6s_ease-in-out_infinite]" />
          </div>

          {/* verso (aparece no giro) */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-[1.6rem] border-[3px] border-[#E46A00] bg-[#065DA0] [backface-visibility:hidden] [transform:rotateY(180deg)]">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="size-24 rounded-full shadow-xl" />
            ) : null}
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#FDFAF4]">Pousada</p>
          </div>
        </div>
      </div>

      {/* sombra no "chão" */}
      <div className="mx-auto mt-6 h-4 w-3/4 bg-[radial-gradient(closest-side,rgba(0,0,0,0.75),transparent)] motion-safe:animate-[sombra_7s_ease-in-out_infinite]" />
    </div>
  );
}
