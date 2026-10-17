"use client";

import { useEffect, useState } from "react";

const chave = (slug: string) => `cartao:${slug}`;

function ler(slug: string) {
  try {
    return localStorage.getItem(chave(slug));
  } catch {
    return null;
  }
}

function ehAndroid() {
  return /Android/i.test(navigator.userAgent);
}

/**
 * Na página do cartão: guarda o link neste aparelho (o QR da mesa passa a abrir direto o cartão)
 * e, logo depois de criar o cartão no Android, abre sozinho o "Salvar no Google Wallet" (uma vez só).
 */
export function GuardarCartaoNoAparelho({ slug, token, abrirGoogleWallet }: { slug: string; token: string; abrirGoogleWallet: boolean }) {
  useEffect(() => {
    try {
      localStorage.setItem(chave(slug), token);
    } catch {}
    if (!abrirGoogleWallet || !ehAndroid()) return;
    try {
      const marca = `wallet-oferecido:${token}`;
      if (sessionStorage.getItem(marca)) return;
      sessionStorage.setItem(marca, "1");
    } catch {
      return;
    }
    // navegação completa de propósito: a rota redireciona para o Google
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    const t = setTimeout(() => window.location.assign(`/api/wallet/google/salvar/${token}?e=${encodeURIComponent(slug)}`), 1500);
    return () => clearTimeout(t);
  }, [slug, token, abrirGoogleWallet]);
  return null;
}

/**
 * Na página de cadastro (onde o QR da mesa leva): se este aparelho já tem um cartão deste restaurante,
 * abre direto o cartão. "?novo=1" no endereço ignora e esquece o cartão guardado.
 */
export function AbrirCartaoSalvo({ slug, classe }: { slug: string; classe?: string }) {
  const [abrindo, setAbrindo] = useState(false);

  useEffect(() => {
    const novo = new URLSearchParams(window.location.search).has("novo");
    if (novo) {
      try {
        localStorage.removeItem(chave(slug));
      } catch {}
      return;
    }
    const token = ler(slug);
    if (!token || !/^[0-9a-f]{48}$/.test(token)) return;
    let ativo = true;
    fetch(`/api/cartao/${token}?e=${encodeURIComponent(slug)}`, { cache: "no-store" })
      .then((r) => {
        if (!ativo) return;
        if (r.ok) {
          setAbrindo(true);
          window.location.replace(`/${slug}/cartao/${token}`);
        } else if (r.status === 404) {
          localStorage.removeItem(chave(slug)); // cartão apagado: esquece
        }
      })
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, [slug]);

  if (!abrindo) return null;
  return (
    <div role="status" className={`fixed inset-0 z-50 flex items-center justify-center p-6 text-center text-xl font-bold ${classe ?? "bg-white text-neutral-900"}`}>
      Abrindo seu cartão…
    </div>
  );
}
