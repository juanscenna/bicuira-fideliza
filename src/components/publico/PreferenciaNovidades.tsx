"use client";

import { useState, useTransition } from "react";
import { Megaphone } from "lucide-react";

/**
 * "Novidades e promoções" no cartão: o cliente liga e desliga quando quiser, no mesmo lugar onde usa o cartão.
 * Desligado, continuam só os avisos do próprio cartão (carimbos e recompensas).
 */
export function PreferenciaNovidades({
  inicial,
  nomeEstabelecimento,
  acao,
  classes,
}: {
  inicial: boolean;
  nomeEstabelecimento: string;
  acao: (aceita: boolean) => Promise<{ ok: boolean; aceita: boolean }>;
  classes?: { caixa?: string; texto?: string };
}) {
  const [aceita, setAceita] = useState(inicial);
  const [erro, setErro] = useState(false);
  const [pendente, iniciar] = useTransition();

  function alternar() {
    const nova = !aceita;
    setErro(false);
    iniciar(async () => {
      const r = await acao(nova);
      if (r.ok) setAceita(r.aceita);
      else setErro(true);
    });
  }

  const caixa = `flex flex-col gap-2 rounded-2xl p-4 ${classes?.caixa ?? "border-2 border-neutral-900 bg-white"}`;
  const texto = `text-sm ${classes?.texto ?? "text-neutral-700"}`;

  return (
    <div className={caixa}>
      <p className="flex items-center gap-2 text-lg font-bold">
        <Megaphone aria-hidden className="size-5" /> Novidades e promoções
      </p>
      <p className={texto} aria-live="polite">
        {aceita
          ? `Você recebe novidades e promoções de ${nomeEstabelecimento} neste cartão.`
          : "Desligado. Você recebe só os avisos do seu cartão (carimbos e recompensas)."}
      </p>
      <button
        type="button"
        role="switch"
        aria-checked={aceita}
        onClick={alternar}
        disabled={pendente}
        className="min-h-11 self-start text-sm font-semibold underline underline-offset-2 disabled:opacity-60"
      >
        {pendente ? "Salvando…" : aceita ? "Não quero mais receber" : "Quero receber novidades"}
      </button>
      {erro ? (
        <p role="alert" className="text-sm font-medium">
          Não deu certo agora. Tente de novo em instantes.
        </p>
      ) : null}
    </div>
  );
}
