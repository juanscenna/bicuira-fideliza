"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
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

  useEffect(() => {
    if (reduzido) return;
    const espera = passo >= META ? PAUSA_COMPLETO_MS : ESPERA_MS[passo];
    const t = setTimeout(() => setPasso((p) => (p >= META ? 0 : p + 1)), espera);
    return () => clearTimeout(t);
  }, [reduzido, passo]);

  const carimbos = reduzido ? 7 : Math.min(passo, META);
  const completo = !reduzido && passo >= META;

  return (
    <div className="relative mx-auto w-full max-w-[360px] py-8 [perspective:1100px]" aria-hidden>
      {/* luzes atrás do cartão */}
      <div className="absolute inset-x-6 top-10 bottom-14 rounded-full bg-[#E8115A] blur-3xl motion-safe:animate-[pulsar_3.2s_ease-in-out_infinite]" />
      <div className="absolute top-4 right-2 size-32 rounded-full bg-[#F2B315] opacity-60 blur-3xl motion-safe:animate-[pulsar_4s_ease-in-out_infinite_1s]" />

      <div className="relative [transform-style:preserve-3d] motion-safe:animate-[balanco3d_7s_ease-in-out_infinite]">
        <div
          key={completo ? "giro" : "parado"}
          className={`relative aspect-[1.58/1] w-full [transform-style:preserve-3d] ${completo ? "animate-[giro360_1.4s_cubic-bezier(.6,0,.3,1)]" : ""}`}
        >
          {/* frente */}
          <div className="absolute inset-0 overflow-hidden rounded-[1.6rem] border-[3px] border-[#E8115A] bg-[radial-gradient(120%_120%_at_0%_0%,#2a0a16_0%,#0A0A0A_55%)] p-4 shadow-[0_30px_60px_-20px_rgba(232,17,90,0.7)] [backface-visibility:hidden]">
            <div className="flex items-center gap-2">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="" className="size-10 rounded-full" />
              ) : null}
              <div className="leading-none">
                <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#F3EEE5]/80">Cartão fidelidade</p>
                <p className="text-lg font-black uppercase text-[#E8115A]">Rosa Norte</p>
              </div>
              <p className="ml-auto text-2xl font-black tabular-nums text-[#F2B315]">
                {carimbos}
                <span className="text-sm text-[#F3EEE5]/60">/{META}</span>
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
                        feito ? "shadow-[0_0_0_2px_#E8115A,0_0_14px_rgba(232,17,90,0.9)]" : "outline-2 outline-dashed outline-[#F3EEE5]/25"
                      } ${novo ? "animate-[carimbo_600ms_ease-out]" : ""}`}
                    >
                      <Selo feito={feito} />
                    </span>
                    {novo ? <span className="absolute inset-0 m-auto size-6 rounded-full bg-[#F2B315] animate-[faisca_700ms_ease-out_forwards]" /> : null}
                  </li>
                );
              })}
            </ol>
            {completo ? (
              <p className="absolute inset-x-4 bottom-3 rounded-xl bg-[#F2B315] py-1.5 text-center text-sm font-black uppercase text-[#0A0A0A]">
                Recompensa liberada!
              </p>
            ) : null}
            {/* brilho holográfico passando */}
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_35%,rgba(255,255,255,0.45)_48%,rgba(242,179,21,0.25)_52%,transparent_65%)] bg-[length:250%_100%] mix-blend-screen motion-safe:animate-[brilho_3.6s_ease-in-out_infinite]" />
          </div>

          {/* verso (aparece no giro) */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-[1.6rem] border-[3px] border-[#F2B315] bg-[#E8115A] [backface-visibility:hidden] [transform:rotateY(180deg)]">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="size-24 rounded-full shadow-xl" />
            ) : null}
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F3EEE5]">Comida caseira</p>
          </div>
        </div>
      </div>

      {/* sombra no "chão" */}
      <div className="mx-auto mt-6 h-4 w-3/4 rounded-[50%] bg-black/70 blur-md motion-safe:animate-[sombra_7s_ease-in-out_infinite]" />
    </div>
  );
}
