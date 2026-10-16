import type { CSSProperties } from "react";
import { QrCode, Smartphone, UserPlus } from "lucide-react";
import type { PropsCadastro } from "../tipos";
import { CartaoDemo } from "./CartaoDemo";
import { fonteRosa, ROSA } from "./estilo";
import { Rosa } from "./Rosa";

const FOTO = "/temas/rosa-norte";

/** Adesivo no estilo "colado" da identidade (texto curto, girado). */
function Adesivo({ children, className, giro }: { children: React.ReactNode; className: string; giro: string }) {
  return (
    <span
      style={{ "--giro": giro } as CSSProperties}
      className={`absolute z-10 inline-flex items-center justify-center font-black uppercase leading-none shadow-[0_6px_0_rgba(0,0,0,0.35)] motion-safe:animate-[flutuar_5s_ease-in-out_infinite] ${className}`}
    >
      {children}
    </span>
  );
}

const FAIXA = ["Comida caseira", "Rosa Norte", "Cartão fidelidade", "Junte selos"];

/**
 * Página de cadastro da Comida Caseira Rosa Norte: foto do lugar, adesivos, faixa animada,
 * cartão demonstrativo girando e o formulário numa folha creme. Celular e computador.
 */
export function CadastroRosaNorte({ estab, formulario }: PropsCadastro) {
  const cores = {
    "--estab-primaria": ROSA.preto,
    "--estab-texto-primaria": ROSA.creme,
    "--estab-secundaria": ROSA.rosa,
    "--estab-texto-secundaria": "#FFFFFF",
  } as CSSProperties;

  return (
    <div style={cores} className={`${fonteRosa.variable} min-h-dvh overflow-x-hidden bg-[#0A0A0A] font-[family-name:var(--fonte-rosa)] text-[#F3EEE5]`}>
      {/* ---------- Abertura compacta: foto do salão + logo + adesivos ---------- */}
      <section className="relative overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${FOTO}/salao-800.webp`}
          srcSet={`${FOTO}/salao-800.webp 800w, ${FOTO}/salao-1600.webp 1600w`}
          sizes="100vw"
          alt="Salão da Comida Caseira Rosa Norte, com mesas de madeira e vista para a mata"
          className="absolute inset-0 size-full object-cover"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,10,10,0.25)_0%,rgba(10,10,10,0.55)_55%,#0A0A0A_100%)]" />

        <Adesivo giro="-8deg" className="top-4 right-4 rounded-md bg-[#E8115A] px-2.5 py-1.5 text-[11px] text-[#F3EEE5] lg:top-8 lg:right-[10%] lg:text-base">
          Cartão fidelidade
        </Adesivo>
        <Adesivo giro="10deg" className="right-6 bottom-6 size-[4.5rem] rounded-full max-lg:hidden bg-[#F2B315] p-1.5 text-center text-[11px] text-[#0A0A0A] lg:right-[16%] lg:bottom-10 lg:size-28 lg:text-sm">
          Junte selos!
        </Adesivo>

        <div className="relative z-10 mx-auto flex max-w-6xl items-center gap-4 px-5 pt-14 pb-8 lg:gap-8 lg:pt-16 lg:pb-14">
          {estab.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={estab.logoUrl}
              alt={estab.nome}
              className="size-28 shrink-0 rounded-full shadow-[0_0_0_4px_#E8115A,0_14px_40px_rgba(232,17,90,0.55)] lg:size-40"
            />
          ) : null}
          <h1 className="text-[1.75rem] leading-[0.95] font-black uppercase lg:text-6xl">
            Junte selos.
            <br />
            Ganhe <span className="text-[#E8115A]">recompensas</span>.
          </h1>
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
          className="relative scroll-mt-6 rounded-[2rem] lg:col-start-1 lg:row-span-2 lg:row-start-1 bg-[#F3EEE5] p-6 text-[#0A0A0A] shadow-[0_0_0_4px_#E8115A,0_30px_80px_-20px_rgba(232,17,90,0.6)] sm:p-8"
        >
          <Rosa className="absolute -top-5 -right-3 size-12 rotate-12 rounded-full bg-[#0A0A0A] p-2 text-[#E8115A]" />
          <h2 className="mb-1 text-3xl font-black uppercase">Crie seu cartão</h2>
          <p className="mb-6 font-semibold text-[#0A0A0A]/75">
            Grátis, sem aplicativo. <span className="text-[#C40E4C]">Leva 30 segundos.</span>
          </p>
          {formulario}
        </section>
        <section aria-labelledby="titulo-como" className="flex flex-col gap-6 lg:col-start-2 lg:row-start-2">
          <h2 id="titulo-como" className="text-2xl font-black uppercase lg:text-3xl">
            Como <span className="text-[#E8115A]">funciona</span>
          </h2>
          <p className="max-w-md text-[#F3EEE5]/85">
            A cada visita, um selo no seu cartão. Completou, a recompensa é sua. Tudo pelo celular, sem baixar aplicativo.
          </p>

          <ol className="grid gap-3 sm:grid-cols-3">
            {[
              { Icone: UserPlus, t: "Cadastre-se", d: "Nome e celular, aqui embaixo." },
              { Icone: QrCode, t: "Mostre no caixa", d: "Seu código a cada visita." },
              { Icone: Smartphone, t: "Ganhe", d: "Cartão completo, recompensa liberada." },
            ].map(({ Icone, t, d }, i) => (
              <li key={t} className="flex gap-3 rounded-2xl border-2 border-[#F3EEE5]/15 bg-[#151515] p-4 sm:flex-col">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#F2B315] font-black text-[#0A0A0A]">{i + 1}</span>
                <div>
                  <p className="flex items-center gap-2 font-extrabold uppercase">
                    <Icone aria-hidden className="size-4 text-[#E8115A]" /> {t}
                  </p>
                  <p className="text-sm text-[#F3EEE5]/75">{d}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

      </main>

      {/* ---------- Faixa amarela correndo ---------- */}
      <div className="relative z-10 mb-14 -rotate-2 overflow-hidden border-y-4 border-[#0A0A0A] bg-[#F2B315] py-3 text-[#0A0A0A]" aria-hidden>
        <div className="flex w-max gap-8 motion-safe:animate-[faixa_18s_linear_infinite]">
          {[...FAIXA, ...FAIXA, ...FAIXA, ...FAIXA].map((t, i) => (
            <span key={i} className="flex items-center gap-8 text-xl font-black uppercase whitespace-nowrap lg:text-2xl">
              {t}
              <Rosa className="size-6 text-[#E8115A]" />
            </span>
          ))}
        </div>
      </div>

      {/* ---------- Fotos ---------- */}
      <section aria-label="O lugar" className="mx-auto flex max-w-4xl justify-center gap-4 px-5 pb-16 sm:gap-8">
        {[
          { src: `${FOTO}/janela-800.webp`, alt: "Mesa com almofadas e janela para a mata", giro: "-rotate-3" },
          { src: `${FOTO}/prato-800.webp`, alt: "Prato sendo montado na cozinha", giro: "rotate-2" },
        ].map((f) => (
          <figure key={f.src} className={`w-1/2 max-w-64 bg-[#F3EEE5] p-2 pb-8 shadow-2xl ${f.giro}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f.src} alt={f.alt} className="aspect-[4/5] w-full object-cover" />
          </figure>
        ))}
      </section>

      <footer className="flex flex-col items-center gap-3 pb-10 text-center">
        <div className="flex gap-3 text-[#E8115A]">
          <Rosa className="size-6" />
          <Rosa className="size-6" />
          <Rosa className="size-6" />
        </div>
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#F3EEE5]/60">por Bicuíra Digital</p>
      </footer>
    </div>
  );
}
