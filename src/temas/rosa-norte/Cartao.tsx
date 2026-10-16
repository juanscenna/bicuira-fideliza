import { Gift } from "lucide-react";
import type { PropsCartao } from "../tipos";
import { fonteRosa } from "./estilo";
import { Rosa } from "./Rosa";

/** Cartão Rosa Norte: preto com borda rosa, rosas como carimbos e destaque amarelo do prato. */
export function CartaoRosaNorte({ estab, cliente, carimbos, meta, recompensa, qrSvg, carimboNovo }: PropsCartao) {
  const cheio = carimbos >= meta;
  const colunas = meta <= 5 ? meta : meta <= 10 ? 5 : 6;
  return (
    <article
      aria-label={`Cartão fidelidade ${estab.nome}`}
      className={`${fonteRosa.variable} mx-auto w-full max-w-[380px] overflow-hidden rounded-[2rem] border-4 border-[#E8115A] bg-[#0A0A0A] font-[family-name:var(--fonte-rosa)] text-[#F3EEE5]`}
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

      <section aria-label={`${Math.min(carimbos, meta)} de ${meta} carimbos`} className="px-5 pt-5">
        <ol className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(${colunas}, minmax(0, 1fr))` }}>
          {Array.from({ length: meta }, (_, i) => {
            const feito = i < carimbos;
            const ultimo = i === meta - 1;
            return (
              <li key={i} className="flex justify-center">
                <span
                  className={`flex aspect-square w-full max-w-14 items-center justify-center rounded-full ${
                    feito
                      ? "bg-[#E8115A] text-[#F3EEE5]"
                      : ultimo
                        ? "border-2 border-[#F2B315] text-[#F2B315]"
                        : "border-2 border-dashed border-[#F3EEE5]/30 text-[#F3EEE5]/25"
                  } ${carimboNovo === i ? "animate-[carimbo_600ms_ease-out]" : ""}`}
                >
                  {ultimo && !feito ? <Gift className="size-1/2" aria-hidden /> : <Rosa className="size-3/5" />}
                </span>
              </li>
            );
          })}
        </ol>
        <p className="mt-5 rounded-2xl bg-[#F2B315] px-4 py-3 text-center text-base font-extrabold uppercase text-[#0A0A0A]">
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
    </article>
  );
}
