import type { ReactNode } from "react";
import { LogOut } from "lucide-react";
import { sair } from "@/app/entrar/acoes";
import type { TemaPainel } from "@/temas/paineis";
import { Navegacao, type ItemMenu } from "./Navegacao";

/** Estrutura comum dos painéis: topo com nome, menu e área de conteúdo. */
export function Moldura({
  titulo,
  subtitulo,
  itens,
  raiz,
  tema,
  children,
}: {
  titulo: string;
  subtitulo: string;
  itens: ItemMenu[];
  raiz: string;
  /** identidade do restaurante (src/temas/paineis.ts); sem tema, fica com a da Bicuíra */
  tema?: TemaPainel;
  children: ReactNode;
}) {
  return (
    <div className={`flex min-h-dvh flex-col ${tema?.classe ?? ""}`}>
      <header
        className={`relative isolate flex items-center justify-between gap-4 overflow-hidden bg-restinga px-4 py-3 text-areia md:px-6 ${
          tema ? "!bg-[var(--painel-topo)] py-6 md:py-7" : ""
        }`}
      >
        {tema ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={tema.foto} alt="" className="absolute inset-0 -z-10 size-full object-cover" />
            <div className="absolute inset-0 -z-10 bg-[image:var(--painel-topo-veu)]" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={tema.logoUrl} alt="" className={tema.logoClasse ?? "size-16 shrink-0 rounded-full shadow-[0_0_0_4px_#E8115A,0_14px_40px_rgba(232,17,90,0.55)] md:size-20"} />
          </>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className={tema ? (tema.etiquetaClasse ?? "mb-1 inline-block -rotate-2 rounded-md bg-[#E8115A] px-2 py-1 text-[11px] font-black uppercase text-[#F3EEE5]") : "text-sm text-areia/80"}>
            {subtitulo}
          </p>
          <p className={`truncate font-display text-2xl leading-tight ${tema ? "text-[var(--painel-texto-topo)]" : ""}`}>{titulo}</p>
        </div>
        <form action={sair}>
          <button
            type="submit"
            className={`flex min-h-11 items-center gap-2 rounded-xl px-3 font-semibold ${tema ? "text-[var(--painel-texto-topo)] hover:bg-white/10" : "text-areia hover:bg-areia/10"}`}
          >
            <LogOut aria-hidden className="size-5" />
            Sair
          </button>
        </form>
      </header>
      {tema?.faixa ? (
        <div className="relative z-10 overflow-hidden border-y-[length:var(--painel-faixa-borda)] border-[var(--painel-faixa-linha)] bg-[var(--painel-faixa)] py-1.5 text-[var(--painel-faixa-texto)]" aria-hidden>
          <div className="flex w-max gap-6 motion-safe:animate-[faixa_24s_linear_infinite]">
            {[...tema.faixa, ...tema.faixa, ...tema.faixa, ...tema.faixa].map((t, i) => (
              <span key={i} className="flex items-center gap-6 text-sm whitespace-nowrap [font-weight:var(--painel-faixa-peso)] [text-transform:var(--painel-faixa-caixa)]">
                {t}
                <span className="size-2 rounded-full bg-[var(--painel-destaque)]" />
              </span>
            ))}
          </div>
        </div>
      ) : null}
      <div className="flex flex-1 flex-col md:flex-row">
        <div className={`hidden md:flex ${tema ? "md:border-r md:border-[var(--painel-lateral-linha)] md:bg-[var(--painel-lateral)]" : "md:bg-restinga"}`}>
          <Navegacao itens={itens} raiz={raiz} />
        </div>
        <main className="w-full flex-1 px-4 pt-6 pb-28 md:px-8 md:pb-10">
          <div className="mx-auto max-w-4xl">{children}</div>
        </main>
        <div className="md:hidden">
          <Navegacao itens={itens} raiz={raiz} />
        </div>
      </div>
    </div>
  );
}
