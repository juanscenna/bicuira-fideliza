import type { CSSProperties } from "react";
import { Check, Gift } from "lucide-react";
import { variaveisTema } from "@/lib/tema";

export type DadosCartao = {
  estabelecimento: { nome: string; logoUrl: string | null; cor_primaria: string; cor_secundaria: string };
  cliente: { nome: string; codigo: string };
  carimbos: number;
  meta: number;
  recompensa: string;
  /** SVG do QR Code (gerado no servidor). */
  qrSvg: string;
  /** Índice (0-based) do carimbo recém-ganho, para animar. */
  carimboNovo?: number | null;
};

/**
 * Cartão no formato de um cartão de fidelidade do Apple Wallet (storeCard):
 * cabeçalho com logo e nome, faixa de carimbos, campos e QR Code com o código ao lado.
 * Cores vêm do estabelecimento; a cor do texto é escolhida pelo contraste.
 */
export function CartaoVisual({ estabelecimento, cliente, carimbos, meta, recompensa, qrSvg, carimboNovo }: DadosCartao) {
  const cheio = carimbos >= meta;
  const faltam = Math.max(meta - carimbos, 0);
  const estilo = variaveisTema(estabelecimento) as CSSProperties;
  const colunas = meta <= 5 ? meta : meta <= 10 ? 5 : 6;

  return (
    <article
      style={estilo}
      aria-label={`Cartão fidelidade ${estabelecimento.nome}`}
      className="mx-auto flex w-full max-w-[380px] flex-col overflow-hidden rounded-[22px] bg-[var(--estab-primaria)] text-[var(--estab-texto-primaria)] shadow-[0_10px_30px_-12px_rgba(0,0,0,0.35)]"
    >
      {/* Cabeçalho */}
      <header className="flex items-center gap-3 px-5 pt-5 pb-4">
        {estabelecimento.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={estabelecimento.logoUrl} alt="" className="size-11 shrink-0 rounded-lg bg-white object-contain" />
        ) : (
          <span
            aria-hidden
            className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[var(--estab-secundaria)] text-lg font-bold text-[var(--estab-texto-secundaria)]"
          >
            {estabelecimento.nome.slice(0, 1).toUpperCase()}
          </span>
        )}
        <p className="min-w-0 flex-1 truncate text-lg font-bold leading-tight">{estabelecimento.nome}</p>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-90">Carimbos</p>
          <p className="text-2xl font-bold leading-none tabular-nums">
            {Math.min(carimbos, meta)}/{meta}
          </p>
        </div>
      </header>

      {/* Faixa de carimbos */}
      <section
        aria-label={`${Math.min(carimbos, meta)} de ${meta} carimbos`}
        className="bg-[var(--estab-secundaria)] px-5 py-5 text-[var(--estab-texto-secundaria)]"
      >
        <ol className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(${colunas}, minmax(0, 1fr))` }}>
          {Array.from({ length: meta }, (_, i) => {
            const preenchido = i < carimbos;
            const ultimo = i === meta - 1;
            return (
              <li key={i} className="flex justify-center">
                <span
                  className={`flex aspect-square w-full max-w-12 items-center justify-center rounded-full border-2 ${
                    preenchido
                      ? "border-[var(--estab-primaria)] bg-[var(--estab-primaria)] text-[var(--estab-texto-primaria)]"
                      : "border-current/35 border-dashed"
                  } ${carimboNovo === i ? "animate-[carimbo_600ms_ease-out]" : ""}`}
                >
                  {preenchido ? (
                    <Check aria-hidden className="size-1/2" strokeWidth={3} />
                  ) : ultimo ? (
                    <Gift aria-hidden className="size-1/2 opacity-60" />
                  ) : null}
                </span>
              </li>
            );
          })}
        </ol>
        <p className="mt-4 text-center text-base font-semibold">
          {cheio ? "Recompensa disponível! Mostre este cartão no caixa." : `Faltam ${faltam} para: ${recompensa}`}
        </p>
      </section>

      {/* Campos */}
      <dl className="grid grid-cols-2 gap-4 px-5 pt-4">
        <div className="min-w-0">
          <dt className="text-xs font-semibold uppercase tracking-wide opacity-90">Cliente</dt>
          <dd className="truncate text-base font-semibold">{cliente.nome}</dd>
        </div>
        <div className="min-w-0 text-right">
          <dt className="text-xs font-semibold uppercase tracking-wide opacity-90">Recompensa</dt>
          <dd className="text-base font-semibold">{recompensa}</dd>
        </div>
      </dl>

      {/* QR Code + código escrito */}
      <div className="m-5 flex items-center gap-4 rounded-2xl bg-white p-3 text-[#1C1C1C]">
        <div className="size-32 shrink-0 [&_svg]:size-full" aria-hidden dangerouslySetInnerHTML={{ __html: qrSvg }} />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide">Código</p>
          <p className="font-mono text-3xl font-bold tracking-widest">{cliente.codigo}</p>
          <p className="mt-1 text-sm">Mostre no caixa a cada visita.</p>
        </div>
      </div>
    </article>
  );
}
