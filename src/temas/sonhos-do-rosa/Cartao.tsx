import { Gift } from "lucide-react";
import type { PropsCartao } from "../tipos";
import { fonteSonhos } from "./estilo";
import { Selo } from "./Selo";

/** Cartão Sonhos do Rosa: bloco branco do site, faixa do sol no topo, logo da pousada como selo. */
export function CartaoSonhosDoRosa({ estab, cliente, carimbos, meta, recompensa, qrSvg, carimboNovo }: PropsCartao) {
  const cheio = carimbos >= meta;
  const colunas = meta <= 5 ? meta : meta <= 10 ? 5 : 6;
  return (
    <article
      aria-label={`Cartão fidelidade ${estab.nome}`}
      className={`${fonteSonhos.variable} relative mx-auto w-full max-w-[380px] overflow-hidden rounded-[1.75rem] border bg-[#FFFFFC] ${
        cheio
          ? "border-[#E46A00] shadow-[0_0_0_3px_#E46A00,0_24px_60px_-20px_rgba(228,106,0,0.6)]"
          : "border-[#E4DDCF] shadow-[0_18px_40px_-24px_rgba(94,70,48,0.45)]"
      } font-[family-name:var(--fonte-sonhos)] text-[#2F2115]`}
    >
      <div aria-hidden className="h-2 bg-[linear-gradient(135deg,#EF8600,#DF5200)]" />
      <header className="flex items-center gap-3 px-5 pt-5">
        {estab.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={estab.logoUrl} alt="" className="h-12 w-auto shrink-0" />
        ) : null}
        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#756657]">Pousada</p>
          <p className="text-xl font-semibold tracking-tight">Sonhos do Rosa</p>
        </div>
        <p className="text-right text-4xl leading-none font-semibold tabular-nums text-[#E46A00]">
          {Math.min(carimbos, meta)}
          <span className="text-lg text-[#756657]">/{meta}</span>
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
                      ? "shadow-[0_0_0_2px_#E46A00]"
                      : ultimo
                        ? "border-2 border-[#065DA0] bg-[#F3EAD9] text-[#065DA0]"
                        : "bg-[#F3EAD9] outline-1 outline-dashed outline-[#756657]/40"
                  } ${carimboNovo === i ? "animate-[carimbo_600ms_ease-out]" : ""}`}
                >
                  {ultimo && !feito ? <Gift className="size-1/2" aria-hidden /> : <Selo feito={feito} />}
                </span>
                {carimboNovo === i ? (
                  <span aria-hidden className="pointer-events-none absolute inset-0 m-auto size-8 rounded-full bg-[#E46A00] animate-[faisca_800ms_ease-out_forwards]" />
                ) : null}
              </li>
            );
          })}
        </ol>
        <p
          className={`mt-5 rounded-full bg-[linear-gradient(135deg,#EF8600,#DF5200)] px-4 py-3 text-center text-base font-semibold text-white ${
            cheio ? "motion-safe:animate-[destaque_1.4s_ease-in-out_infinite]" : ""
          }`}
        >
          {cheio ? `Ganhou: ${recompensa}! Mostre no caixa` : `Faltam ${meta - carimbos} para ${recompensa}`}
        </p>
      </section>

      <div className="m-5 flex items-center gap-4 rounded-2xl border border-[#E4DDCF] bg-[#F3EAD9] p-3 text-[#2F2115]">
        <div className="size-24 shrink-0 rounded-lg bg-white p-1 min-[360px]:size-28 [&_svg]:size-full" aria-hidden dangerouslySetInnerHTML={{ __html: qrSvg }} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{cliente.nome}</p>
          <p className="text-2xl font-bold tracking-wider text-[#065DA0] min-[360px]:text-3xl min-[360px]:tracking-widest">{cliente.codigo}</p>
          <p className="text-xs text-[#756657]">Mostre no caixa a cada visita.</p>
        </div>
      </div>
      {/* brilho passando, como no cartão de demonstração */}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 -left-full w-[300%] bg-[linear-gradient(115deg,transparent_42%,rgba(255,255,255,0.5)_49%,rgba(239,134,0,0.06)_51%,transparent_58%)] motion-safe:animate-[brilho_5s_ease-in-out_infinite]" />
    </article>
  );
}
