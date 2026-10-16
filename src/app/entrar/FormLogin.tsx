"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { Campo } from "@/components/ui/Campo";
import { entrar, type EstadoLogin } from "./acoes";

export function FormLogin({ volta, avisoInicial }: { volta?: string; avisoInicial?: string }) {
  const [estado, acao, enviando] = useActionState<EstadoLogin, FormData>(entrar, {});
  const [verSenha, setVerSenha] = useState(false);
  const erro = estado.erro ?? avisoInicial;

  return (
    <form action={acao} className="flex flex-col gap-5">
      <input type="hidden" name="volta" value={volta ?? ""} />
      <Campo
        id="email"
        name="email"
        type="email"
        rotulo="E-mail"
        autoComplete="username"
        inputMode="email"
        required
        defaultValue={estado.email}
      />
      <div className="relative">
        <Campo
          id="senha"
          name="senha"
          type={verSenha ? "text" : "password"}
          rotulo="Senha"
          autoComplete="current-password"
          required
          className="w-full pr-14"
        />
        <button
          type="button"
          onClick={() => setVerSenha((v) => !v)}
          className="absolute right-1 top-8 flex size-11 items-center justify-center rounded-lg text-restinga"
          aria-label={verSenha ? "Esconder senha" : "Mostrar senha"}
        >
          {verSenha ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
        </button>
      </div>
      {erro ? (
        <p role="alert" className="rounded-xl border-2 border-sol bg-white px-4 py-3 font-medium">
          {erro}
        </p>
      ) : null}
      <Botao type="submit" grande disabled={enviando}>
        {enviando ? "Entrando…" : "Entrar"}
      </Botao>
    </form>
  );
}
