"use client";

import { useState, useTransition } from "react";
import { Download, Trash2 } from "lucide-react";

/**
 * "Seus dados" no cartão (LGPD art. 18): baixar uma cópia e apagar, sem precisar pedir a ninguém.
 * Apagar é irreversível: pede confirmação.
 */
export function SeusDados({
  slug,
  token,
  acaoApagar,
  classes,
}: {
  slug: string;
  token: string;
  acaoApagar: () => Promise<{ ok: boolean }>;
  classes?: { caixa?: string; texto?: string; perigo?: string };
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [estado, setEstado] = useState<"normal" | "apagado" | "erro">("normal");
  const [pendente, iniciar] = useTransition();

  const caixa = `flex flex-col gap-3 rounded-2xl p-4 ${classes?.caixa ?? "border-2 border-neutral-900 bg-white"}`;
  const texto = `text-sm ${classes?.texto ?? "text-neutral-700"}`;
  const link = "flex min-h-11 items-center gap-2 self-start text-sm font-semibold underline underline-offset-2";

  function apagar() {
    iniciar(async () => {
      const r = await acaoApagar();
      if (!r.ok) return setEstado("erro");
      try {
        localStorage.removeItem(`cartao:${slug}`); // o QR da mesa não abre mais este cartão
      } catch {}
      setEstado("apagado");
    });
  }

  if (estado === "apagado") {
    return (
      <div className={caixa} role="status">
        <p className="text-lg font-bold">Seus dados foram apagados.</p>
        <p className={texto}>Este cartão não funciona mais. Se quiser voltar ao programa, é só criar um cartão novo.</p>
        <a href={`/${slug}?novo=1`} className={link}>
          Criar um cartão novo
        </a>
      </div>
    );
  }

  return (
    <section aria-labelledby="titulo-seus-dados" className={caixa}>
      <h2 id="titulo-seus-dados" className="text-lg font-bold">
        Seus dados
      </h2>
      <a href={`/api/cartao/${token}/meus-dados?e=${encodeURIComponent(slug)}`} download className={link}>
        <Download aria-hidden className="size-4" /> Baixar meus dados
      </a>
      {confirmando ? (
        <div className="flex flex-col gap-3">
          <p className={texto}>
            Apagar seu nome e celular? Os carimbos e as recompensas deste cartão serão perdidos e o cartão para de funcionar.
            Não dá para desfazer.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={apagar}
              disabled={pendente}
              className={`min-h-12 rounded-xl px-4 font-bold disabled:opacity-60 ${classes?.perigo ?? "bg-red-800 text-white"}`}
            >
              {pendente ? "Apagando…" : "Sim, apagar meus dados"}
            </button>
            <button type="button" onClick={() => setConfirmando(false)} disabled={pendente} className="min-h-12 px-2 font-semibold underline underline-offset-2">
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirmando(true)} className={link}>
          <Trash2 aria-hidden className="size-4" /> Apagar meus dados
        </button>
      )}
      {estado === "erro" ? (
        <p role="alert" className="text-sm font-medium">
          Não deu certo agora. Tente de novo em instantes.
        </p>
      ) : null}
    </section>
  );
}
