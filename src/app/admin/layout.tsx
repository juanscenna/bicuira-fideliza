import type { Metadata } from "next";
import { exigirSuperAdmin } from "@/lib/auth";
import { Moldura } from "@/components/painel/Moldura";
import type { ItemMenu } from "@/components/painel/Navegacao";

export const metadata: Metadata = { title: "Admin" };

const MENU: ItemMenu[] = [{ href: "/admin", rotulo: "Estabelecimentos", icone: "estabelecimentos" }];

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const sessao = await exigirSuperAdmin();
  return (
    <Moldura titulo="Bicuíra Fideliza" subtitulo={`Admin · ${sessao.email}`} itens={MENU} raiz="/admin">
      {children}
    </Moldura>
  );
}
