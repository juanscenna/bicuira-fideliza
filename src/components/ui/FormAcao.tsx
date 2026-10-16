"use client";

import { startTransition, useActionState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { EstadoForm } from "@/app/admin/acoes";

/**
 * Formulário pequeno ligado a uma ação do servidor, com mensagem de resultado.
 * `children` recebe os erros por campo. Os campos são limpos só quando a ação dá certo.
 */
export function FormAcao({
  acao,
  children,
  className = "",
}: {
  acao: (anterior: EstadoForm, form: FormData) => Promise<EstadoForm>;
  children: (estado: EstadoForm, enviando: boolean) => ReactNode;
  className?: string;
}) {
  const [estado, enviar, enviando] = useActionState(acao, {});
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const dados = new FormData(form);
        startTransition(async () => {
          await enviar(dados);
        });
      }}
      className={`flex flex-col gap-4 ${className}`}
    >
      {children(estado, enviando)}
      {estado.mensagem ? (
        <p
          role="status"
          className={`flex items-start gap-2 rounded-xl px-4 py-3 font-medium ${estado.ok ? "bg-lima" : "border-2 border-sol bg-white"}`}
        >
          {estado.ok ? (
            <CheckCircle2 aria-hidden className="mt-0.5 size-5 shrink-0" />
          ) : (
            <AlertTriangle aria-hidden className="mt-0.5 size-5 shrink-0 text-sol" />
          )}
          {estado.mensagem}
        </p>
      ) : null}
    </form>
  );
}
