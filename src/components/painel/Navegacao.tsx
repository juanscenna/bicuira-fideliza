"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Bell, Home, QrCode, Store, Users } from "lucide-react";

// Ícones por nome: componentes não podem ser passados do servidor para o navegador.
const ICONES = { inicio: Home, clientes: Users, metricas: BarChart3, avisos: Bell, estabelecimentos: Store, qr: QrCode };

export type ItemMenu = { href: string; rotulo: string; icone: keyof typeof ICONES };

function ativo(caminho: string, href: string, raiz: string) {
  return href === raiz ? caminho === raiz : caminho === href || caminho.startsWith(`${href}/`);
}

/** Celular: barra fixa embaixo (perto do polegar). Computador: barra lateral. */
export function Navegacao({ itens, raiz }: { itens: ItemMenu[]; raiz: string }) {
  const caminho = usePathname();
  return (
    <nav
      aria-label="Menu principal"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-areia/15 bg-restinga pb-[env(safe-area-inset-bottom)] md:static md:w-56 md:shrink-0 md:border-t-0 md:pb-0"
    >
      <ul className="grid grid-cols-4 md:flex md:flex-col md:gap-1 md:p-3">
        {itens.map(({ href, rotulo, icone }) => {
          const Icone = ICONES[icone];
          const atual = ativo(caminho, href, raiz);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={atual ? "page" : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-1 text-sm font-semibold md:min-h-12 md:flex-row md:justify-start md:gap-3 md:rounded-xl md:px-4 md:text-base ${
                  atual ? "text-lima md:bg-areia/10" : "text-areia hover:text-white"
                }`}
              >
                <Icone aria-hidden className="size-6 shrink-0" strokeWidth={atual ? 2.5 : 2} />
                {rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
