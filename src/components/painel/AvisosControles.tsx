"use client";

import { useOptimistic, useTransition } from "react";
import { alternarAutomacao, cancelarCampanha } from "@/app/painel/avisos/acoes";
import type { TipoAutomatica } from "@/lib/notificacoes/regras";
import { useTermos } from "./Termos";

/** Interruptor liga/desliga de uma automática para um plano. */
export function InterruptorAutomacao({ tipo, plano, ativa }: { tipo: TipoAutomatica; plano: "morador" | "turista"; ativa: boolean }) {
  const [pendente, iniciar] = useTransition();
  const [ligada, setLigada] = useOptimistic(ativa);
  const { t } = useTermos();
  const rotulo = t(plano === "morador" ? "Moradores" : "Turistas");
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligada}
      disabled={pendente}
      onClick={() =>
        iniciar(async () => {
          setLigada(!ligada);
          await alternarAutomacao(tipo, plano, !ligada);
        })
      }
      className="flex min-h-12 items-center gap-3 rounded-xl border-2 border-restinga/20 px-3 font-semibold"
    >
      <span aria-hidden className={`relative h-7 w-12 rounded-full transition ${ligada ? "bg-restinga" : "bg-carvao/25"}`}>
        <span className={`absolute top-1 size-5 rounded-full bg-white transition-all ${ligada ? "left-6" : "left-1"}`} />
      </span>
      {rotulo}: {ligada ? "ligada" : "desligada"}
    </button>
  );
}

export function BotaoCancelarCampanha({ id }: { id: string }) {
  const [pendente, iniciar] = useTransition();
  return (
    <button
      type="button"
      disabled={pendente}
      onClick={() => iniciar(async () => void (await cancelarCampanha(id)))}
      className="min-h-11 self-start font-semibold text-restinga underline underline-offset-4"
    >
      {pendente ? "Cancelando…" : "Cancelar envio agendado"}
    </button>
  );
}
