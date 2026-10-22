import type { CSSProperties } from "react";
import { QrCode, Smartphone, UserPlus } from "lucide-react";
import type { PropsCadastro } from "../tipos";
import { CartaoDemo } from "./CartaoDemo";
import { fonteSonhos, SOMBRA, SONHOS } from "./estilo";
import { Adesivo, Faixa } from "./Pecas";
import { Sol } from "./Sol";

const FOTO = "/temas/sonhos-do-rosa";

/**
 * Página de cadastro da Pousada Sonhos do Rosa: mesmo layout da Rosa Norte (foto, etiquetas,
 * faixa, cartão demonstrativo e formulário), com a linguagem do site da pousada:
 * fundo creme, blocos brancos com borda clara, sombra suave, laranja do sol e azul do mar.
 */
export function CadastroSonhosDoRosa({ estab, formulario, jaTenho }: PropsCadastro) {
  const cores = {
    "--estab-primaria": SONHOS.sol,
    "--estab-texto-primaria": "#FFFFFF",
    "--estab-secundaria": SONHOS.mar,
    "--estab-texto-secundaria": "#FFFFFF",
  } as CSSProperties;

  return (
    <div style={cores} className={`${fonteSonhos.variable} min-h-dvh overflow-x-clip bg-[#FDFAF4] font-[family-name:var(--fonte-sonhos)] text-[#2F2115]`}>
      {/* ---------- Abertura: a mesma foto do site (Praia do Rosa ao pôr do sol) + logo ---------- */}
      <section className="relative overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${FOTO}/salao-800.webp`}
          srcSet={`${FOTO}/salao-800.webp 800w, ${FOTO}/salao-1600.webp 1600w`}
          sizes="100vw"
          alt="Vista aérea da Praia do Rosa ao pôr do sol"
          className="absolute inset-0 size-full object-cover"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(47,33,21,0.15)_0%,rgba(47,33,21,0.55)_60%,rgba(47,33,21,0.75)_100%)]" />

        <Adesivo giro="-4deg" className="top-4 right-4 rounded-full bg-[#FDFAF4] px-3.5 py-2 text-xs text-[#2F2115] lg:top-8 lg:right-[10%] lg:text-sm">
          Cartão fidelidade
        </Adesivo>
        <Adesivo giro="6deg" className="right-6 bottom-8 rounded-full bg-[linear-gradient(135deg,#EF8600,#DF5200)] px-4 py-2.5 text-sm text-white max-lg:hidden lg:right-[16%] lg:bottom-12">
          Junte selos!
        </Adesivo>

        <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-start gap-4 px-5 pt-14 pb-12 lg:flex-row lg:items-center lg:gap-8 lg:pt-16 lg:pb-20">
          {estab.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={estab.logoUrl} alt={estab.nome} className="h-20 w-auto shrink-0 drop-shadow-lg lg:h-28" />
          ) : null}
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-[#FDFAF4]/90 uppercase">Pousada Sonhos do Rosa</p>
            <h1 className="mt-2 text-[2rem] leading-tight font-semibold tracking-tight text-[#FDFAF4] lg:text-5xl">
              Junte selos.
              <br />
              Ganhe recompensas.
            </h1>
          </div>
        </div>
      </section>

      {/* ---------- Como funciona + cadastro ---------- */}
      <main className="mx-auto grid max-w-6xl gap-8 px-5 pt-0 pb-12 lg:grid-cols-[1fr_1.05fr] lg:items-start lg:gap-x-16 lg:gap-y-2 lg:pt-6 lg:pb-20">
        {/* celular: 1º o cartão animado; computador: coluna da direita, em cima */}
        <div className="-mt-4 lg:col-start-2 lg:row-start-1 lg:mt-0">
          <CartaoDemo logoUrl={estab.logoUrl} />
        </div>

        <section
          id="cadastro"
          aria-label="Criar meu cartão"
          className={`relative scroll-mt-6 rounded-2xl border border-[#E4DDCF] bg-[#FFFFFC] p-6 text-[#2F2115] ${SOMBRA} sm:p-8 lg:col-start-1 lg:row-span-2 lg:row-start-1`}
        >
          <span className="absolute -top-5 -right-3 flex size-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#EF8600,#DF5200)] text-white shadow-lg">
            <Sol className="size-5" aria-hidden />
          </span>
          <h2 className="mb-1 text-3xl font-semibold tracking-tight">Crie seu cartão</h2>
          <p className="mb-3 text-[#756657]">
            Grátis, sem aplicativo. <span className="font-semibold text-[#065DA0]">Leva 30 segundos.</span>
          </p>
          <div className="mb-6">{jaTenho}</div>
          {formulario}
        </section>
        <section aria-labelledby="titulo-como" className="flex flex-col gap-6 lg:col-start-2 lg:row-start-2">
          <h2 id="titulo-como" className="text-2xl font-semibold tracking-tight lg:text-3xl">
            Como funciona
          </h2>
          <p className="max-w-md text-[#756657]">
            A cada hospedagem, um selo no seu cartão. Completou, a recompensa é sua. Tudo pelo celular, sem baixar aplicativo.
          </p>

          <ol className="grid gap-3 sm:grid-cols-3">
            {[
              { Icone: UserPlus, t: "Cadastre-se", d: "Nome e celular, aqui embaixo." },
              { Icone: QrCode, t: "Mostre na recepção", d: "Seu código a cada hospedagem." },
              { Icone: Smartphone, t: "Ganhe", d: "Cartão completo, recompensa liberada." },
            ].map(({ Icone, t, d }, i) => (
              <li key={t} className={`flex gap-3 rounded-2xl border border-[#E4DDCF] bg-[#FFFFFC] p-4 ${SOMBRA} sm:flex-col`}>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#EF8600,#DF5200)] font-semibold text-white">{i + 1}</span>
                <div>
                  <p className="flex items-center gap-2 font-semibold">
                    <Icone aria-hidden className="size-4 text-[#065DA0]" /> {t}
                  </p>
                  <p className="text-sm text-[#756657]">{d}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <Faixa />

      {/* ---------- Fotos da pousada (as mesmas do site deles) ---------- */}
      <section aria-label="A pousada" className="mx-auto flex max-w-4xl justify-center gap-4 px-5 pb-16 sm:gap-8">
        {[
          { src: `${FOTO}/janela-800.webp`, alt: "Cabana com Vista ao Jardim, quarto", giro: "-rotate-2" },
          { src: `${FOTO}/prato-800.webp`, alt: "Cabana Superior com Vista ao Vale, fachada", giro: "rotate-2" },
        ].map((f) => (
          <figure key={f.src} className={`w-1/2 max-w-64 overflow-hidden rounded-2xl border border-[#E4DDCF] bg-[#FFFFFC] p-2 ${SOMBRA} ${f.giro}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f.src} alt={f.alt} loading="lazy" className="aspect-[4/5] w-full rounded-xl object-cover" />
          </figure>
        ))}
      </section>

      <footer className="flex flex-col items-center gap-3 pb-10 text-center">
        <a
          href="https://www.instagram.com/sonhos_do_rosa/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-[#065DA0] underline-offset-4 hover:underline"
        >
          @sonhos_do_rosa
        </a>
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#756657]">por Bicuíra Digital</p>
      </footer>
    </div>
  );
}
