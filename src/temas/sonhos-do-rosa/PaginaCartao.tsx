import type { CSSProperties } from "react";
import Link from "next/link";
import { Gift, QrCode, Stamp } from "lucide-react";
import type { PropsPaginaCartao } from "../tipos";
import { fonteSonhos, SOMBRA, SONHOS } from "./estilo";
import { Adesivo, Faixa } from "./Pecas";

const FOTO = "/temas/sonhos-do-rosa";

/**
 * Página do cartão da Pousada Sonhos do Rosa: mesmo layout da página de cadastro
 * (foto da praia, etiqueta, faixa areia), com o cartão de verdade no centro.
 */
export function PaginaCartaoSonhosDoRosa({ estab, primeiroNome, status, cartao, guardar, regras, privacidadeHref, outroCartaoHref }: PropsPaginaCartao) {
  const cores = {
    "--estab-primaria": SONHOS.sol,
    "--estab-texto-primaria": "#FFFFFF",
    "--estab-secundaria": SONHOS.mar,
    "--estab-texto-secundaria": "#FFFFFF",
  } as CSSProperties;

  const passos = [
    { Icone: QrCode, t: "Mostre na recepção", d: <>Seu código <strong className="text-[#065DA0]">{regras.codigo}</strong> a cada hospedagem.</> },
    { Icone: Stamp, t: "Ganhe um selo", d: <>Cada hospedagem vale 1 selo.</> },
    {
      Icone: Gift,
      t: "Recompensa",
      d: regras.meta && regras.recompensa ? <>Com {regras.meta} selos: <strong className="text-[#2F2115]">{regras.recompensa}</strong>.</> : <>Cartão completo, recompensa liberada.</>,
    },
  ];

  return (
    <div style={cores} className={`${fonteSonhos.variable} min-h-dvh overflow-x-clip bg-[#FDFAF4] font-[family-name:var(--fonte-sonhos)] text-[#2F2115]`}>
      {/* ---------- Abertura: foto da praia + logo + saudação ---------- */}
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
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(47,33,21,0.15)_0%,rgba(47,33,21,0.55)_60%,rgba(47,33,21,0.75)_100%)]" />

        <Adesivo giro="-4deg" className="top-4 right-4 rounded-full bg-[#FDFAF4] px-3.5 py-2 text-xs text-[#2F2115] lg:top-8 lg:right-[10%] lg:text-sm">
          Meu cartão
        </Adesivo>

        <div className="relative z-10 mx-auto flex max-w-xl flex-col items-start gap-3 px-5 pt-14 pb-12">
          {estab.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={estab.logoUrl} alt={estab.nome} className="h-16 w-auto shrink-0 drop-shadow-lg" />
          ) : null}
          <h1 className="min-w-0 text-[2rem] leading-tight font-semibold tracking-tight break-words text-[#FDFAF4]">
            Olá, {primeiroNome}!
            <br />
            <span className="text-xl font-medium text-[#FDFAF4]/90">Seus selos estão aqui.</span>
          </h1>
        </div>
      </section>

      <main className="mx-auto -mt-6 flex max-w-xl flex-col gap-10 px-5 pb-12">
        {status ? (
          <p role="status" className={`relative z-10 self-center rounded-full border border-[#E4DDCF] bg-[#FFFFFC] px-5 py-2.5 text-center text-sm font-semibold text-[#2F2115] ${SOMBRA}`}>
            {status === "novo" ? "Cartão criado! Mostre o código na recepção." : "Este telefone já tinha um cartão: aqui está ele."}
          </p>
        ) : null}

        {/* ---------- O cartão, com luz suave atrás ---------- */}
        <section aria-label="Seu cartão" className="relative isolate">
          <div aria-hidden className="absolute -inset-x-10 -top-6 h-3/5 -z-10 bg-[radial-gradient(closest-side,rgba(239,134,0,0.22),transparent)] motion-safe:animate-[pulsar_3.2s_ease-in-out_infinite]" />
          <div aria-hidden className="absolute -right-10 bottom-10 size-48 -z-10 bg-[radial-gradient(closest-side,rgba(6,93,160,0.14),transparent)] motion-safe:animate-[pulsar_4s_ease-in-out_infinite_1s]" />
          {cartao}
        </section>

        {/* ---------- Como funciona (com as regras reais) ---------- */}
        <section aria-labelledby="titulo-como" className="flex flex-col gap-4">
          <h2 id="titulo-como" className="text-2xl font-semibold tracking-tight">
            Como funciona
          </h2>
          <ol className="grid gap-3">
            {passos.map(({ Icone, t, d }, i) => (
              <li key={t} className={`flex items-center gap-4 rounded-2xl border border-[#E4DDCF] bg-[#FFFFFC] p-4 ${SOMBRA}`}>
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#EF8600,#DF5200)] text-lg font-semibold text-white">{i + 1}</span>
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-semibold">
                    <Icone aria-hidden className="size-4 text-[#065DA0]" /> {t}
                  </p>
                  <p className="text-sm text-[#756657]">{d}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="text-sm text-[#756657]">A recompensa é entregue na recepção e o cartão começa de novo.</p>
        </section>

        {/* ---------- Guardar no celular ---------- */}
        <section aria-labelledby="titulo-guardar" className="relative flex flex-col gap-3 rounded-2xl border border-[#E4DDCF] bg-[#F3EAD9] p-6 text-[#2F2115]">
          <h2 id="titulo-guardar" className="text-2xl font-semibold tracking-tight">
            Guarde no celular
          </h2>
          <p className="text-[#2F2115]/80">Este link é o seu cartão. Salve para abrir com um toque.</p>
          <div className="text-white">{guardar}</div>
          <p className="text-sm text-[#756657]">Trocou de celular? Cadastre de novo com o mesmo telefone e o cartão volta.</p>
        </section>
      </main>

      <Faixa />

      <footer className="flex flex-col items-center gap-3 pb-10 text-center">
        <a
          href="https://www.instagram.com/sonhos_do_rosa/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-[#065DA0] underline-offset-4 hover:underline"
        >
          @sonhos_do_rosa
        </a>
        <Link href={privacidadeHref} className="text-sm font-semibold underline underline-offset-4">
          Política de privacidade
        </Link>
        <Link href={outroCartaoHref} className="text-sm text-[#756657] underline underline-offset-4">
          Não é o seu cartão? Criar outro
        </Link>
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#756657]">por Bicuíra Digital</p>
      </footer>
    </div>
  );
}
