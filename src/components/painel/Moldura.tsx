import type { ReactNode } from "react";
import { LogOut } from "lucide-react";
import { sair } from "@/app/entrar/acoes";
import { Navegacao, type ItemMenu } from "./Navegacao";

/** Estrutura comum dos painéis: topo com nome, menu e área de conteúdo. */
export function Moldura({
  titulo,
  subtitulo,
  itens,
  raiz,
  children,
}: {
  titulo: string;
  subtitulo: string;
  itens: ItemMenu[];
  raiz: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between gap-4 bg-restinga px-4 py-3 text-areia md:px-6">
        <div className="min-w-0">
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
