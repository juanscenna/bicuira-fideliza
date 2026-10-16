import type { CSSProperties } from "react";
import { ArrowDown, QrCode, Smartphone, UserPlus } from "lucide-react";
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

const FAIXA = ["Comida caseira", "Rosa Norte", "Cartão fidelidade", "Junte rosas"];

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
      {/* ---------- Abertura: foto do salão + logo + adesivos ---------- */}
      <section className="relative flex h-[78svh] min-h-[520px] items-end justify-center lg:h-[86svh]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${FOTO}/salao-800.webp`}
          srcSet={`${FOTO}/salao-800.webp 800w, ${FOTO}/salao-1600.webp 1600w`}
          sizes="100vw"
          alt="Salão da Comida Caseira Rosa Norte, com mesas de madeira e vista para a mata"
          className="absolute inset-0 size-full object-cover"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,10,10,0.15)_0%,rgba(10,10,10,0.35)_45%,#0A0A0A_100%)]" />

        <Adesivo giro="-8deg" className="top-[12%] left-4 rounded-md bg-[#E8115A] px-3 py-2 text-sm text-[#F3EEE5] lg:left-[12%] lg:text-lg">
          Cartão fidelidade
        </Adesivo>
        <Adesivo giro="10deg" className="top-[22%] right-4 size-24 rounded-full bg-[#F2B315] p-2 text-center text-[13px] text-[#0A0A0A] lg:right-[14%] lg:size-32 lg:text-base">
          Junte rosas!
        </Adesivo>
        <Adesivo giro="4deg" className="top-[40%] left-3 rounded-sm bg-[#F3EEE5] px-3 py-1.5 text-xs tracking-widest text-[#0A0A0A] lg:left-[18%] lg:text-sm">
          Comida caseira
        </Adesivo>

        <div className="relative z-10 flex flex-col items-center gap-5 pb-10">
          {estab.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={estab.logoUrl}
              alt={estab.nome}
              className="size-48 rounded-full shadow-[0_0_0_5px_#E8115A,0_20px_60px_rgba(232,17,90,0.55)] lg:size-60"
            />
          ) : null}
          <a
            href="#cadastro"
            className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#E8115A] px-6 text-base font-extrabold uppercase text-[#F3EEE5] shadow-[0_8px_0_#8a0a36] active:translate-y-1 active:shadow-[0_4px_0_#8a0a36]"
          >
            Criar meu cartão <ArrowDown aria-hidden className="size-5" />
          </a>
        </div>
      </section>

      {/* ---------- Faixa amarela correndo ---------- */}
      <div className="relative z-10 -mt-2 -rotate-2 overflow-hidden border-y-4 border-[#0A0A0A] bg-[#F2B315] py-3 text-[#0A0A0A]" aria-hidden>
        <div className="flex w-max gap-8 motion-safe:animate-[faixa_18s_linear_infinite]">
          {[...FAIXA, ...FAIXA, ...FAIXA, ...FAIXA].map((t, i) => (
            <span key={i} className="flex items-center gap-8 text-xl font-black uppercase whitespace-nowrap lg:text-2xl">
              {t}
              <Rosa className="size-6 text-[#E8115A]" />
            </span>
          ))}
        </div>
      </div>

      {/* ---------- Como funciona + cadastro ---------- */}
      <main className="mx-auto grid max-w-6xl gap-12 px-5 py-14 lg:grid-cols-[1.1fr_1fr] lg:items-start lg:gap-16 lg:py-20">
        <section aria-labelledby="titulo-como" className="flex flex-col gap-6 lg:sticky lg:top-8">
          <h1 id="titulo-como" className="text-4xl leading-[0.95] font-black uppercase lg:text-6xl">
            Junte rosas.
            <br />
            Ganhe <span className="text-[#E8115A]">recompensas</span>.
          </h1>
          <p className="max-w-md text-lg text-[#F3EEE5]/85">
            A cada visita, uma rosa no seu cartão. Completou, a recompensa é sua. Tudo pelo celular, sem baixar aplicativo.
          </p>

          <CartaoDemo logoUrl={estab.logoUrl} />

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

        <section
          id="cadastro"
          aria-label="Criar meu cartão"
          className="relative scroll-mt-6 rounded-[2rem] bg-[#F3EEE5] p-6 text-[#0A0A0A] shadow-[0_0_0_4px_#E8115A,0_30px_80px_-20px_rgba(232,17,90,0.6)] sm:p-8"
        >
          <Rosa className="absolute -top-5 -right-3 size-12 rotate-12 rounded-full bg-[#0A0A0A] p-2 text-[#E8115A]" />
          <h2 className="mb-1 text-3xl font-black uppercase">Crie seu cartão</h2>
          <p className="mb-6 text-[#0A0A0A]/75">Leva menos de um minuto.</p>
          {formulario}
        </section>
      </main>

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
