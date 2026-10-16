import { Check, Gift } from "lucide-react";
import type { PropsCartao } from "../tipos";

/** Cartão do tema básico: preto, carimbos brancos, QR Code e código grande. */
export function CartaoBasico({ estab, cliente, carimbos, meta, recompensa, qrSvg, carimboNovo }: PropsCartao) {
  const cheio = carimbos >= meta;
  const colunas = meta <= 5 ? meta : meta <= 10 ? 5 : 6;
  return (
    <article aria-label={`Cartão fidelidade ${estab.nome}`} className="mx-auto w-full max-w-[380px] overflow-hidden rounded-3xl bg-[#111] text-white">
      <header className="flex items-end justify-between gap-3 px-6 pt-6">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/70">Cartão fidelidade</p>
          <p className="text-xl font-black uppercase leading-tight [overflow-wrap:anywhere]">{estab.nome}</p>
        </div>
        <p className="shrink-0 text-right text-4xl font-black tabular-nums leading-none">
          {Math.min(carimbos, meta)}
          <span className="text-xl text-white/60">/{meta}</span>
        </p>
      </header>

      <section aria-label={`${Math.min(carimbos, meta)} de ${meta} carimbos`} className="px-6 pt-6">
        <ol className="grid gap-3" style={{ gridTemplateColumns: `repeat(${colunas}, minmax(0, 1fr))` }}>
          {Array.from({ length: meta }, (_, i) => {
            const feito = i < carimbos;
            return (
              <li key={i} className="flex justify-center">
                <span
                  className={`flex aspect-square w-full max-w-14 items-center justify-center rounded-full ${
                    feito ? "bg-white text-[#111]" : "border-2 border-dashed border-white/40 text-white/40"
                  } ${carimboNovo === i ? "animate-[carimbo_600ms_ease-out]" : ""}`}
                >
                  {feito ? <Check aria-hidden className="size-1/2" strokeWidth={3.5} /> : i === meta - 1 ? <Gift aria-hidden className="size-1/2" /> : null}
                </span>
              </li>
            );
          })}
        </ol>
        <p className="mt-5 border-t border-white/20 pt-4 text-center text-lg font-bold">
          {cheio ? "Recompensa liberada! Mostre no caixa." : `Faltam ${meta - carimbos} para: ${recompensa}`}
        </p>
      </section>

      <div className="m-6 mt-4 flex items-center gap-4 rounded-2xl bg-white p-3 text-[#111]">
        <div className="size-28 shrink-0 [&_svg]:size-full" aria-hidden dangerouslySetInnerHTML={{ __html: qrSvg }} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{cliente.nome}</p>
          <p className="font-mono text-3xl font-black tracking-widest">{cliente.codigo}</p>
          <p className="text-xs">Mostre no caixa a cada visita.</p>
        </div>
      </div>
    </article>
  );
}
