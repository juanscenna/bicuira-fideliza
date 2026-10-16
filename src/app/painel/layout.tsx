import type { Metadata } from "next";
import { exigirDono } from "@/lib/auth";
import { Moldura } from "@/components/painel/Moldura";
import type { ItemMenu } from "@/components/painel/Navegacao";
import { temaDo } from "@/temas/config";
import { PAINEIS } from "@/temas/paineis";

export const metadata: Metadata = { title: "Painel" };

const MENU: ItemMenu[] = [
  { href: "/painel", rotulo: "Início", icone: "inicio" },
  { href: "/painel/clientes", rotulo: "Clientes", icone: "clientes" },
  { href: "/painel/metricas", rotulo: "Métricas", icone: "metricas" },
  { href: "/painel/avisos", rotulo: "Avisos", icone: "avisos" },
];

export default async function PainelLayout({ children }: LayoutProps<"/painel">) {
  const sessao = await exigirDono();
  const { estabelecimento } = sessao;

  return (
    <Moldura titulo={estabelecimento.nome} subtitulo="Painel do estabelecimento" itens={MENU} raiz="/painel" tema={PAINEIS[temaDo(estabelecimento.slug)]}>
      {estabelecimento.ativo ? (
        children
      ) : (
        <section className="rounded-2xl border-2 border-sol bg-white p-6">
          <h1 className="font-display text-3xl text-restinga">Estabelecimento desativado</h1>
          <p className="mt-2 text-lg">
            O programa de fidelidade está pausado. Fale com a equipe Bicuíra para reativar.
          </p>
        </section>
      )}
    </Moldura>
  );
}
