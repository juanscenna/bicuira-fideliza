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
 * O mais adequado ao aparelho vem primeiro e em destaque; os dois aparecem sempre.
 */
export function BotoesWallet({ token, slug, apple, google }: { token: string; slug: string; apple: boolean; google: boolean }) {
  const aparelho = useAparelho();

  const botoes = [
    { id: "apple", rotulo: "Adicionar ao Apple Wallet", href: `/api/wallet/apple/pass/${token}?e=${slug}`, pronto: apple },
    { id: "google", rotulo: "Adicionar ao Google Wallet", href: `/api/wallet/google/salvar/${token}?e=${slug}`, pronto: google },
  ];
  if (aparelho === "android") botoes.reverse();
  const nenhum = !apple && !google;

  return (
    <div className="flex flex-col gap-3">
      {botoes.map((b, i) =>
        b.pronto ? (
          <a
            key={b.id}
            href={b.href}
            className={`flex min-h-14 items-center justify-center gap-2 rounded-2xl px-5 text-lg font-bold ${
              i === 0 && aparelho !== "outro" ? "bg-black text-white" : "border-2 border-black bg-white text-black"
            }`}
          >
            <Smartphone aria-hidden className="size-5" />
            {b.rotulo}
          </a>
        ) : (
          <div
            key={b.id}
            aria-disabled
            className="flex min-h-14 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-300 px-5 py-2 text-center text-neutral-600"
          >
            <span className="font-semibold">{b.rotulo}</span>
            <span className="text-sm">Wallet ainda não configurado</span>
          </div>
        ),
      )}
      {nenhum ? (
        <p className="text-sm text-neutral-600">Enquanto isso, use este cartão pelo navegador. Ele funciona do mesmo jeito.</p>
      ) : null}
    </div>
  );
}

/** Instruções para salvar o cartão web na tela inicial, abertas no passo do aparelho do cliente. */
export function SalvarNaTelaInicial() {
  const aparelho = useAparelho();
  return (
    <details className="rounded-2xl bg-white p-4 [&_li]:mt-1" open={aparelho !== "outro"}>
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
        <p className="text-sm text-neutral-600">Assim o cartão abre com um toque, como um aplicativo.</p>
      </div>
    </details>
  );
}
