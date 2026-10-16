"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { X } from "lucide-react";

/** Extrai o código do cartão do conteúdo do QR (o QR do cartão contém só o código, ex.: K4827). */
export function codigoDoQr(conteudo: string) {
  const m = conteudo.trim().toUpperCase().match(/(?:^|[^A-Z0-9])([A-HJKMNP-Z]\d{4})(?:$|[^A-Z0-9])/);
  return m ? m[1] : null;
}

/** Leitor de QR pela câmera (celular ou webcam), sem aplicativo. */
export function LeitorQR({ aoLer, aoFechar }: { aoLer: (codigo: string) => void; aoFechar: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [erro, setErro] = useState<string | null>(null);
  const lido = useRef(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let quadro = 0;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    function ler() {
      const v = video.current;
      if (v && ctx && v.readyState >= 2 && !lido.current) {
        const escala = Math.min(1, 640 / v.videoWidth);
        canvas.width = Math.floor(v.videoWidth * escala);
        canvas.height = Math.floor(v.videoHeight * escala);
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const qr = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
        const codigo = qr ? codigoDoQr(qr.data) : null;
        if (codigo) {
          lido.current = true;
          navigator.vibrate?.(80);
          aoLer(codigo);
          return;
        }
      }
      quadro = requestAnimationFrame(ler);
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      queueMicrotask(() => setErro("Este navegador não permite usar a câmera. Digite o código."));
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })
      .then((s) => {
        stream = s;
        if (video.current) {
          video.current.srcObject = s;
          video.current.play().catch(() => {});
        }
        quadro = requestAnimationFrame(ler);
      })
      .catch(() => setErro("Não foi possível abrir a câmera. Permita o acesso à câmera no navegador ou digite o código."));

    return () => {
      cancelAnimationFrame(quadro);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [aoLer]);

  return (
    <div role="dialog" aria-modal aria-label="Escanear QR Code" className="fixed inset-0 z-50 flex flex-col bg-carvao/95 p-4">
      <div className="mx-auto flex w-full max-w-md items-center justify-between py-2 text-areia">
        <p className="font-display text-2xl">Aponte para o QR do cartão</p>
        <button type="button" onClick={aoFechar} aria-label="Fechar leitor" className="flex size-12 items-center justify-center rounded-xl hover:bg-areia/10">
          <X aria-hidden className="size-7" />
        </button>
      </div>
      <div className="relative mx-auto mt-4 aspect-square w-full max-w-md overflow-hidden rounded-3xl bg-black">
        <video ref={video} playsInline muted className="size-full object-cover" />
        <div aria-hidden className="pointer-events-none absolute inset-[15%] rounded-2xl border-4 border-lima" />
      </div>
      {erro ? (
        <p role="alert" className="mx-auto mt-6 max-w-md rounded-xl bg-areia px-4 py-3 font-medium text-carvao">
          {erro}
        </p>
      ) : (
        <p className="mx-auto mt-6 max-w-md text-center text-areia">O cartão abre sozinho quando o código for lido.</p>
      )}
    </div>
  );
}
