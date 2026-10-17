"use client";

import { startTransition, useActionState, useState } from "react";
import { mascararTelefone } from "@/lib/dominio/telefone";
import type { EstadoAbrir } from "@/app/[slug]/acoes";

/** "Já tenho cartão": abre o cartão digitando só o celular (para quem trocou de celular ou limpou o navegador). */
export function JaTenhoCartao({
  acao,
  classes,
}: {
  acao: (anterior: EstadoAbrir, form: FormData) => Promise<EstadoAbrir>;
  classes?: { link?: string; campo?: string; botao?: string; erro?: string };
}) {
  const [aberto, setAberto] = useState(false);
  const [telefone, setTelefone] = useState("");
  const [estado, enviar, enviando] = useActionState(acao, {});

  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)} className={`min-h-11 text-left font-bold underline underline-offset-4 ${classes?.link ?? ""}`}>
        Já tenho cartão → abrir o meu
      </button>
    );
  }
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const dados = new FormData(e.currentTarget);
        startTransition(() => enviar(dados));
      }}
      className="flex w-full min-w-0 flex-col gap-2"
    >
      <label htmlFor="ja-tenho-telefone" className="font-bold">
        Seu celular (o mesmo do cadastro)
      </label>
      <div className="flex gap-2">
        <input
          id="ja-tenho-telefone"
          name="telefone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          autoFocus
          size={1}
          placeholder="(48) 99999-0001"
          value={telefone}
          onChange={(e) => setTelefone(mascararTelefone(e.target.value))}
          aria-invalid={Boolean(estado.erro)}
          aria-describedby={estado.erro ? "ja-tenho-erro" : undefined}
          className={`min-h-14 min-w-0 flex-1 rounded-xl border-2 px-4 text-lg ${classes?.campo ?? "border-neutral-300 bg-white text-neutral-900"}`}
        />
        <button type="submit" disabled={enviando} className={`min-h-14 shrink-0 rounded-xl px-5 font-bold disabled:opacity-60 ${classes?.botao ?? "bg-black text-white"}`}>
          {enviando ? "Abrindo…" : "Abrir"}
        </button>
      </div>
      {estado.erro ? (
        <p id="ja-tenho-erro" role="alert" className={`text-sm font-semibold ${classes?.erro ?? "text-red-700"}`}>
          {estado.erro}
        </p>
      ) : null}
    </form>
  );
}
