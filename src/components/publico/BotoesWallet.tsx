"use client";

import { useSyncExternalStore } from "react";
import { Smartphone } from "lucide-react";

type Aparelho = "ios" | "android" | "outro";

const semAssinatura = () => () => {};

/** Tipo de aparelho (no servidor: "outro"; no navegador: detectado pelo user agent). */
function useAparelho(): Aparelho {
  return useSyncExternalStore(semAssinatura, detectar, () => "outro");
}

function detectar(): Aparelho {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "outro";
}

/**
 * Botões "Adicionar ao Apple Wallet" e "Adicionar ao Google Wallet".
 * Só aparecem os Wallets já configurados; o Google não aparece no iPhone (não existe lá).
 * O mais adequado ao aparelho vem primeiro e em destaque.
 */
export function BotoesWallet({ token, slug, apple, google }: { token: string; slug: string; apple: boolean; google: boolean }) {
  const aparelho = useAparelho();

  const botoes = [
    { id: "apple", rotulo: "Adicionar ao Apple Wallet", href: `/api/wallet/apple/pass/${token}?e=${slug}`, pronto: apple && aparelho !== "android" },
    { id: "google", rotulo: "Adicionar ao Google Wallet", href: `/api/wallet/google/salvar/${token}?e=${slug}`, pronto: google && aparelho !== "ios" },
  ].filter((b) => b.pronto);
  if (aparelho === "android") botoes.reverse();
  if (botoes.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {botoes.map((b, i) => (
        <a
          key={b.id}
          href={b.href}
          className={`flex min-h-14 items-center justify-center gap-2 rounded-2xl px-5 text-lg font-bold ${
            i === 0 ? "bg-black text-white" : "border-2 border-black bg-white text-black"
          }`}
        >
          <Smartphone aria-hidden className="size-5" />
          {b.rotulo}
        </a>
      ))}
    </div>
  );
}

/** Instruções para salvar o cartão web na tela inicial, abertas no passo do aparelho do cliente. */
export function SalvarNaTelaInicial({ className }: { className?: string } = {}) {
  const aparelho = useAparelho();
  return (
    <details className={`rounded-2xl p-4 [&_li]:mt-1 ${className ?? "border-2 border-neutral-900 bg-white"}`} open={aparelho !== "outro"}>
      <summary className="min-h-11 cursor-pointer content-center text-lg font-semibold">Salvar este cartão na tela inicial</summary>
      <div className="mt-2 flex flex-col gap-4 text-base">
        {aparelho !== "android" ? (
          <div>
            <p className="font-semibold">iPhone (Safari)</p>
            <ol className="list-decimal pl-6">
              <li>Toque no botão Compartilhar (quadrado com seta para cima).</li>
              <li>Escolha “Adicionar à Tela de Início”.</li>
            </ol>
          </div>
        ) : null}
        {aparelho !== "ios" ? (
          <div>
            <p className="font-semibold">Android (Chrome)</p>
            <ol className="list-decimal pl-6">
              <li>Toque no menu ⋮ no canto de cima.</li>
              <li>Escolha “Adicionar à tela inicial”.</li>
            </ol>
          </div>
        ) : null}
        <p className="text-sm opacity-75">Assim o cartão abre com um toque, como um aplicativo.</p>
      </div>
    </details>
  );
}
