import type { Metadata } from "next";
import { iconesDo } from "@/temas/config";

// Todas as páginas do restaurante (cadastro, cartão, privacidade) usam a logo dele como ícone da aba.
export async function generateMetadata({ params }: LayoutProps<"/[slug]">): Promise<Metadata> {
  return { icons: iconesDo((await params).slug) };
}

export default function LayoutEstabelecimento({ children }: LayoutProps<"/[slug]">) {
  return children;
}
