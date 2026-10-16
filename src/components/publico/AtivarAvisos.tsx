"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";

type Estado = "carregando" | "sem_suporte" | "iphone_fora_da_tela_inicial" | "bloqueado" | "desligado" | "ligado" | "erro";

function base64ParaBytes(base64: string) {
  const b = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(b), (c) => c.charCodeAt(0));
}

function ehIphone() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
}

function abertoComoApp() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

/**
 * "Ativar avisos": notificações do restaurante direto no celular (web push).
 * Android: funciona no navegador. iPhone: só com o cartão salvo na tela inicial (iOS 16.4+).
 */
export function AtivarAvisos({
  token,
  slug,
  chavePublica,
  classes,
}: {
  token: string;
  slug: string;
  chavePublica: string;
  classes?: { caixa?: string; botao?: string; texto?: string };
}) {
  const [estado, setEstado] = useState<Estado>("carregando");
  const api = `/api/push/${token}?e=${encodeURIComponent(slug)}`;

  useEffect(() => {
    let ativo = true;
    (async () => {
      const suporta = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      let novo: Estado;
      if (!suporta) novo = ehIphone() && !abertoComoApp() ? "iphone_fora_da_tela_inicial" : "sem_suporte";
      else if (Notification.permission === "denied") novo = "bloqueado";
      else {
        const reg = await navigator.serviceWorker.register("/sw.js");
        const inscricao = await reg.pushManager.getSubscription();
        novo = inscricao && Notification.permission === "granted" ? "ligado" : "desligado";
        // garante que o servidor tem a inscrição atual deste aparelho
        if (inscricao && novo === "ligado") fetch(api, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(inscricao) });
      }
      if (ativo) setEstado(novo);
    })().catch(() => ativo && setEstado("erro"));
    return () => {
      ativo = false;
    };
  }, [api]);

  async function ligar() {
    try {
      const permissao = await Notification.requestPermission();
      if (permissao !== "granted") return setEstado(permissao === "denied" ? "bloqueado" : "desligado");
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const inscricao =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ParaBytes(chavePublica) }));
      const r = await fetch(api, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(inscricao) });
      setEstado(r.ok ? "ligado" : "erro");
    } catch {
      setEstado("erro");
    }
  }

  async function desligar() {
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    const inscricao = await reg?.pushManager.getSubscription();
    if (inscricao) {
      await fetch(api, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: inscricao.endpoint }) });
      await inscricao.unsubscribe();
    }
    setEstado("desligado");
  }

  if (estado === "carregando" || estado === "sem_suporte") return null;

  const caixa = `flex flex-col gap-3 rounded-2xl p-4 ${classes?.caixa ?? "border-2 border-neutral-900 bg-white"}`;
  const botao = `flex min-h-14 items-center justify-center gap-2 rounded-2xl px-5 text-lg font-bold ${classes?.botao ?? "bg-black text-white"}`;
  const texto = `text-sm ${classes?.texto ?? "text-neutral-700"}`;

  return (
    <div className={caixa}>
      {estado === "ligado" ? (
        <>
          <p className="flex items-center gap-2 text-lg font-bold">
            <BellRing aria-hidden className="size-5" /> Avisos ligados neste celular
          </p>
          <p className={texto}>Você recebe as novidades do restaurante e os avisos do seu cartão.</p>
          <button type="button" onClick={desligar} className="self-start text-sm font-semibold underline underline-offset-2">
            Desligar avisos
          </button>
        </>
      ) : estado === "desligado" || estado === "erro" ? (
        <>
          <button type="button" onClick={ligar} className={botao}>
            <Bell aria-hidden className="size-5" /> Ativar avisos
          </button>
          <p className={texto}>
            {estado === "erro" ? "Não deu certo agora. Tente de novo em instantes." : "Receba as novidades do restaurante direto na tela do celular."}
          </p>
        </>
      ) : estado === "bloqueado" ? (
        <p className={`flex items-start gap-2 ${texto}`}>
          <BellOff aria-hidden className="mt-0.5 size-4 shrink-0" /> Os avisos estão bloqueados neste navegador. Para ligar, libere as notificações deste site nas configurações do navegador.
        </p>
      ) : (
        <p className={`flex items-start gap-2 ${texto}`}>
          <Bell aria-hidden className="mt-0.5 size-4 shrink-0" /> Para receber avisos no iPhone, primeiro salve este cartão na tela inicial (passo a passo abaixo) e abra por lá.
        </p>
      )}
    </div>
  );
}
