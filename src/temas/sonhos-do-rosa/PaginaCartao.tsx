import type { CSSProperties } from "react";
import Link from "next/link";
import { Gift, QrCode, Stamp } from "lucide-react";
import type { PropsPaginaCartao } from "../tipos";
import { fonteSonhos, SONHOS } from "./estilo";
import { Adesivo, Faixa } from "./Pecas";

const FOTO = "/temas/sonhos-do-rosa";

/**
 * Página do cartão da Pousada Sonhos do Rosa: mesma linguagem da página de cadastro
 * (foto do salão, adesivos, faixa amarela), agora com o cartão de verdade no centro.
 */
export function PaginaCartaoSonhosDoRosa({ estab, primeiroNome, status, cartao, guardar, regras, privacidadeHref, outroCartaoHref }: PropsPaginaCartao) {
  const cores = {
    "--estab-primaria": SONHOS.preto,
    "--estab-texto-primaria": SONHOS.creme,
    "--estab-secundaria": SONHOS.azul,
    "--estab-texto-secundaria": "#FFFFFF",
  } as CSSProperties;

  const passos = [
    { Icone: QrCode, t: "Mostre no caixa", d: <>Seu código <strong className="text-[#E46A00]">{regras.codigo}</strong> a cada visita.</> },
    { Icone: Stamp, t: "Ganhe um selo", d: <>Visitas a partir de {regras.gastoMinimo} valem 1 selo.</> },
    {
      Icone: Gift,
      t: "Recompensa",
      d: regras.meta && regras.recompensa ? <>Com {regras.meta} selos: <strong className="text-[#E46A00]">{regras.recompensa}</strong>.</> : <>Cartão completo, recompensa liberada.</>,
    },
  ];

  return (
    <div style={cores} className={`${fonteSonhos.variable} min-h-dvh overflow-x-clip bg-[#2F2115] font-[family-name:var(--fonte-sonhos)] text-[#FDFAF4]`}>
      {/* ---------- Abertura: foto do salão + logo + saudação ---------- */}
      <section className="relative overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${FOTO}/salao-800.webp`}
          srcSet={`${FOTO}/salao-800.webp 800w, ${FOTO}/salao-1600.webp 1600w`}
          sizes="100vw"
          alt=""
          className="absolute inset-0 size-full object-cover"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(47,33,21,0.25)_0%,rgba(47,33,21,0.6)_55%,#2F2115_100%)]" />

        <Adesivo giro="-8deg" className="top-4 right-4 rounded-md bg-[#065DA0] px-2.5 py-1.5 text-[11px] text-[#FDFAF4] lg:top-8 lg:right-[10%] lg:text-base">
          Meu cartão
        </Adesivo>

        <div className="relative z-10 mx-auto flex max-w-xl items-center gap-4 px-5 pt-14 pb-6">
          {estab.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={estab.logoUrl} alt={estab.nome} className="size-24 shrink-0 rounded-full shadow-[0_0_0_4px_#065DA0,0_14px_40px_rgba(6,93,160,0.55)]" />
          ) : null}
          <h1 className="min-w-0 text-[1.75rem] leading-[0.95] font-black uppercase break-words">
            Olá, <span className="text-[#065DA0]">{primeiroNome}</span>!
            <br />
            <span className="text-xl">Seus selos estão aqui.</span>
          </h1>
        </div>
      </section>

      <main className="mx-auto flex max-w-xl flex-col gap-10 px-5 pb-12">
        {status ? (
          <p
            role="status"
            className="-rotate-1 self-center rounded-xl border-4 border-[#2F2115] bg-[#E46A00] px-4 py-2 text-center text-sm font-black uppercase text-[#2F2115] shadow-[0_6px_0_#065DA0]"
          >
            {status === "novo" ? "Cartão criado! Mostre o código no caixa." : "Este telefone já tinha um cartão: aqui está ele."}
          </p>
        ) : null}

        {/* ---------- O cartão, com luzes atrás ---------- */}
        <section aria-label="Seu cartão" className="relative isolate">
          <div aria-hidden className="absolute -inset-x-10 -top-6 h-3/5 -z-10 bg-[radial-gradient(closest-side,rgba(6,93,160,0.75),transparent)] motion-safe:animate-[pulsar_3.2s_ease-in-out_infinite]" />
          <div aria-hidden className="absolute -right-10 bottom-10 size-48 -z-10 bg-[radial-gradient(closest-side,rgba(228,106,0,0.45),transparent)] motion-safe:animate-[pulsar_4s_ease-in-out_infinite_1s]" />
          {cartao}
        </section>

        {/* ---------- Como funciona (com as regras reais) ---------- */}
        <section aria-labelledby="titulo-como" className="flex flex-col gap-4">
          <h2 id="titulo-como" className="text-2xl font-black uppercase">
            Como <span className="text-[#065DA0]">funciona</span>
          </h2>
          <ol className="grid gap-3">
            {passos.map(({ Icone, t, d }, i) => (
              <li key={t} className="flex items-center gap-4 rounded-2xl border-2 border-[#FDFAF4]/15 bg-[#3D2E20] p-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#E46A00] text-lg font-black text-[#2F2115]">{i + 1}</span>
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-extrabold uppercase">
                    <Icone aria-hidden className="size-4 text-[#065DA0]" /> {t}
                  </p>
                  <p className="text-sm text-[#FDFAF4]/80">{d}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="text-sm text-[#FDFAF4]/70">A recompensa é entregue no balcão e o cartão começa de novo.</p>
        </section>

        {/* ---------- Guardar no celular ---------- */}
        <section aria-labelledby="titulo-guardar" className="relative flex flex-col gap-3 rounded-[2rem] bg-[#FDFAF4] p-6 text-[#2F2115] shadow-[0_0_0_4px_#065DA0]">
          <h2 id="titulo-guardar" className="text-2xl font-black uppercase">
            Guarde no <span className="text-[#04497D]">celular</span>
          </h2>
          <p className="font-semibold text-[#2F2115]/75">Este link é o seu cartão. Salve para abrir com um toque.</p>
          <div className="text-[#FDFAF4]">{guardar}</div>
          <p className="text-sm text-[#2F2115]/70">Trocou de celular? Cadastre de novo com o mesmo telefone e o cartão volta.</p>
        </section>
      </main>

      <Faixa />

      <footer className="flex flex-col items-center gap-3 pb-10 text-center">
        <Link href={privacidadeHref} className="text-sm font-bold underline underline-offset-4">
          Política de privacidade
        </Link>
        <Link href={outroCartaoHref} className="text-sm text-[#FDFAF4]/70 underline underline-offset-4">
          Não é o seu cartão? Criar outro
        </Link>
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#FDFAF4]/60">por Bicuíra Digital</p>
      </footer>
    </div>
  );
}
