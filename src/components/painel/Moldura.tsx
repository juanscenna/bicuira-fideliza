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
          tema ? "border-b-4 border-sol py-4" : ""
        }`}
      >
        {tema ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={tema.foto} alt="" className="absolute inset-0 -z-10 size-full object-cover" />
            <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(10,10,10,0.92)_30%,rgba(10,10,10,0.55))]" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={tema.logoUrl} alt="" className="size-14 shrink-0 rounded-full shadow-[0_0_0_3px_#E8115A] md:size-16" />
          </>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="text-sm text-areia/80">{subtitulo}</p>
          <p className="truncate font-display text-2xl leading-tight">{titulo}</p>
        </div>
        <form action={sair}>
          <button
            type="submit"
            className="flex min-h-11 items-center gap-2 rounded-xl px-3 font-semibold text-areia hover:bg-areia/10"
          >
            <LogOut aria-hidden className="size-5" />
            Sair
          </button>
        </form>
      </header>
      <div className="flex flex-1 flex-col md:flex-row">
        <div className="hidden md:flex md:bg-restinga">
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
