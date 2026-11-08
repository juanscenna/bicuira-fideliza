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
 * e, logo depois de criar o cartão no Android, leva NA HORA ao "Salvar no Google Wallet" (uma vez por aparelho).
 * A página do cartão fica no histórico: ao voltar do Google, o cliente cai no cartão web, que segue funcionando.
 */
export function GuardarCartaoNoAparelho({ slug, token, abrirGoogleWallet }: { slug: string; token: string; abrirGoogleWallet: boolean }) {
  const [abrindo, setAbrindo] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(chave(slug), token);
    } catch {}
    if (!abrirGoogleWallet || !ehAndroid()) return;
    // localStorage (e não sessionStorage): voltar do Google, recarregar ou abrir outra aba não abre de novo
    const marca = `wallet-aberto:${token}`;
    try {
      if (localStorage.getItem(marca)) return;
    } catch {
      return;
    }
    // ao voltar do Google (o navegador pode restaurar a página da memória), some o aviso
    const aoVoltar = () => setAbrindo(false);
    window.addEventListener("pageshow", aoVoltar);
    // se o navegador não sair da página (bloqueou a abertura), o aviso some e o botão fica à vista
    let desistir: ReturnType<typeof setTimeout> | undefined;
    // no primeiro quadro: mostra o aviso e já navega (sem espera)
    const quadro = requestAnimationFrame(() => {
      try {
        localStorage.setItem(marca, "1"); // marcado só aqui: se o efeito for cancelado antes, ainda abre
      } catch {}
      setAbrindo(true);
      // navegação completa de propósito: a rota redireciona para o Google
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign(`/api/wallet/google/salvar/${token}?e=${encodeURIComponent(slug)}`);
      desistir = setTimeout(aoVoltar, 6000);
    });
    return () => {
      cancelAnimationFrame(quadro);
      clearTimeout(desistir);
      window.removeEventListener("pageshow", aoVoltar);
    };
  }, [slug, token, abrirGoogleWallet]);

  if (!abrindo) return null;
  return (
    <div role="status" className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-white p-6 text-center text-neutral-900">
      <p className="text-xl font-bold">Abrindo o Google Wallet…</p>
      <p className="max-w-xs text-base">Toque em Salvar. Depois é só voltar: seu cartão continua aqui também.</p>
    </div>
  );
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
