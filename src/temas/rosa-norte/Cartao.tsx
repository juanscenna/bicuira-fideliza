import { Gift } from "lucide-react";
import type { PropsCartao } from "../tipos";
import { fonteRosa } from "./estilo";
import { Selo } from "./Selo";

/** Cartão Rosa Norte: preto com borda rosa, logo do restaurante como selo e destaque amarelo do prato. */
export function CartaoRosaNorte({ estab, cliente, carimbos, meta, recompensa, qrSvg, carimboNovo }: PropsCartao) {
  const cheio = carimbos >= meta;
  const colunas = meta <= 5 ? meta : meta <= 10 ? 5 : 6;
  return (
    <article
      aria-label={`Cartão fidelidade ${estab.nome}`}
      className={`${fonteRosa.variable} relative mx-auto w-full max-w-[380px] overflow-hidden rounded-[2rem] border-4 bg-[radial-gradient(120%_120%_at_0%_0%,#2a0a16_0%,#0A0A0A_55%)] ${
        cheio
          ? "border-[#F2B315] shadow-[0_0_0_4px_#E8115A,0_24px_70px_-10px_rgba(242,179,21,0.8)]"
          : "border-[#E8115A] shadow-[0_24px_60px_-18px_rgba(232,17,90,0.65)]"
      } font-[family-name:var(--fonte-rosa)] text-[#F3EEE5]`}
    >
      <header className="flex items-center gap-3 px-5 pt-5">
        {estab.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={estab.logoUrl} alt="" className="size-14 rounded-full" />
        ) : null}
        <div className="min-w-0 flex-1 leading-none">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em]">Comida caseira</p>
          <p className="text-2xl font-black uppercase text-[#E8115A]">Rosa Norte</p>
        </div>
        <p className="text-right text-4xl font-black leading-none tabular-nums text-[#F2B315]">
          {Math.min(carimbos, meta)}
          <span className="text-lg text-[#F3EEE5]/60">/{meta}</span>
        </p>
      </header>

      <section aria-label={`${Math.min(carimbos, meta)} de ${meta} selos`} className="px-5 pt-5">
        <ol className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(${colunas}, minmax(0, 1fr))` }}>
          {Array.from({ length: meta }, (_, i) => {
            const feito = i < carimbos;
            const ultimo = i === meta - 1;
            return (
              <li key={i} className="relative flex justify-center">
                <span
                  className={`flex aspect-square w-full max-w-14 items-center justify-center rounded-full ${
                    feito
                      ? "shadow-[0_0_0_2px_#E8115A,0_0_12px_rgba(232,17,90,0.7)]"
                      : ultimo
                        ? "border-2 border-[#F2B315] text-[#F2B315]"
                        : "outline-2 outline-dashed outline-[#F3EEE5]/30"
                  } ${carimboNovo === i ? "animate-[carimbo_600ms_ease-out]" : ""}`}
                >
                  {ultimo && !feito ? <Gift className="size-1/2" aria-hidden /> : <Selo feito={feito} />}
                </span>
                {carimboNovo === i ? (
                  <span aria-hidden className="pointer-events-none absolute inset-0 m-auto size-8 rounded-full bg-[#F2B315] animate-[faisca_800ms_ease-out_forwards]" />
                ) : null}
              </li>
            );
          })}
        </ol>
        <p
          className={`mt-5 rounded-2xl bg-[#F2B315] px-4 py-3 text-center text-base font-extrabold uppercase text-[#0A0A0A] ${
            cheio ? "motion-safe:animate-[destaque_1.4s_ease-in-out_infinite]" : ""
          }`}
        >
          {cheio ? `Ganhou: ${recompensa}! Mostre no caixa` : `Faltam ${meta - carimbos} para ${recompensa}`}
        </p>
      </section>

      <div className="m-5 flex items-center gap-4 rounded-2xl bg-[#F3EEE5] p-3 text-[#0A0A0A]">
        <div className="size-28 shrink-0 [&_svg]:size-full" aria-hidden dangerouslySetInnerHTML={{ __html: qrSvg }} />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{cliente.nome}</p>
          <p className="text-3xl font-black tracking-widest">{cliente.codigo}</p>
          <p className="text-xs font-medium">Mostre no caixa a cada visita.</p>
        </div>
      </div>
      {/* brilho passando, como no cartão de demonstração */}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 -left-full w-[300%] bg-[linear-gradient(115deg,transparent_42%,rgba(255,255,255,0.12)_49%,rgba(242,179,21,0.08)_51%,transparent_58%)] motion-safe:animate-[brilho_5s_ease-in-out_infinite]" />
    </article>
  );
}
