"use client";

import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { Home, Luggage } from "lucide-react";
import { mascararTelefone } from "@/lib/dominio/telefone";
import type { EstadoCadastro } from "@/app/[slug]/acoes";

type Props = {
  acao: (anterior: EstadoCadastro, form: FormData) => Promise<EstadoCadastro>;
  slug: string;
  perguntarPlano: boolean;
  textoConsentimento: string;
};

const campo =
  "min-h-14 w-full rounded-xl border-2 border-neutral-300 bg-white px-4 text-lg text-neutral-900 focus:border-[var(--estab-primaria)] focus:outline-none aria-[invalid=true]:border-red-700";

export function FormCadastro({ acao, slug, perguntarPlano, textoConsentimento }: Props) {
  const [estado, enviar, enviando] = useActionState(acao, {});
  const [telefone, setTelefone] = useState("");
  const [plano, setPlano] = useState("");
  const erros = estado.erros ?? {};

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const dados = new FormData(e.currentTarget);
        startTransition(() => enviar(dados));
      }}
      className="flex flex-col gap-6"
    >
      {/* Campo-isca para robôs: invisível para pessoas e leitores de tela */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Site <input name="site" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <input type="hidden" name="precisa_plano" value={perguntarPlano ? "1" : "0"} />

      <div className="flex flex-col gap-2">
        <label htmlFor="nome" className="text-base font-semibold">
          Seu nome
        </label>
        <input id="nome" name="nome" autoComplete="name" required maxLength={60} className={campo} aria-invalid={!!erros.nome} aria-describedby={erros.nome ? "erro-nome" : undefined} />
        {erros.nome ? <Erro id="erro-nome">{erros.nome}</Erro> : null}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="telefone" className="text-base font-semibold">
          Celular com DDD
        </label>
        <input
          id="telefone"
          name="telefone"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="(48) 99999-0000"
          value={telefone}
          onChange={(e) => setTelefone(mascararTelefone(e.target.value))}
          className={campo}
          aria-invalid={!!erros.telefone}
          aria-describedby={erros.telefone ? "erro-telefone" : "ajuda-telefone"}
        />
        {erros.telefone ? (
          <Erro id="erro-telefone">{erros.telefone}</Erro>
        ) : (
          <p id="ajuda-telefone" className="text-sm text-neutral-600">
            Serve para recuperar seu cartão se trocar de celular. Não enviamos SMS.
          </p>
        )}
      </div>

      {perguntarPlano ? (
        <fieldset className="flex flex-col gap-3" aria-describedby={erros.plano ? "erro-plano" : undefined}>
          <legend className="mb-3 text-base font-semibold">Você é morador da região ou está de visita?</legend>
          <div className="grid grid-cols-2 gap-3">
            {[
              { valor: "morador", rotulo: "Sou morador", Icone: Home },
              { valor: "turista", rotulo: "Estou de visita", Icone: Luggage },
            ].map(({ valor, rotulo, Icone }) => (
              <label
                key={valor}
                className={`flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 bg-white p-3 text-center text-lg font-semibold transition has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 ${
                  plano === valor
                    ? "border-[var(--estab-primaria)] ring-2 ring-[var(--estab-primaria)]"
                    : "border-neutral-300"
                }`}
              >
                <input type="radio" name="plano" value={valor} checked={plano === valor} onChange={() => setPlano(valor)} className="sr-only" />
                <Icone aria-hidden className="size-8" />
                {rotulo}
              </label>
            ))}
          </div>
          {erros.plano ? <Erro id="erro-plano">{erros.plano}</Erro> : null}
        </fieldset>
      ) : null}

      <div className="flex flex-col gap-2">
        <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-neutral-100 p-4">
          <input
            type="checkbox"
            name="consentimento"
            className="mt-0.5 size-6 shrink-0 accent-[var(--estab-primaria)]"
            aria-invalid={!!erros.consentimento}
            aria-describedby={erros.consentimento ? "erro-consentimento" : undefined}
          />
          <span className="text-sm leading-relaxed">
            {textoConsentimento}{" "}
            <Link href={`/${slug}/privacidade`} target="_blank" className="font-semibold underline underline-offset-2">
              Política de privacidade
            </Link>
          </span>
        </label>
        {erros.consentimento ? <Erro id="erro-consentimento">{erros.consentimento}</Erro> : null}
      </div>

      {estado.mensagem ? (
        <p role="alert" className="rounded-xl border-2 border-red-700 bg-white px-4 py-3 font-medium text-red-800">
          {estado.mensagem}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={enviando}
        className="min-h-14 rounded-2xl bg-[var(--estab-primaria)] px-6 text-xl font-bold text-[var(--estab-texto-primaria)] transition active:scale-[0.99] disabled:opacity-60"
      >
        {enviando ? "Criando seu cartão…" : "Criar meu cartão"}
      </button>
    </form>
  );
}

function Erro({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} role="alert" className="text-sm font-medium text-red-800">
      {children}
    </p>
  );
}
