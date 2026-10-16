"use client";

import { Botao } from "@/components/ui/Botao";
import { Campo } from "@/components/ui/Campo";
import { FormAcao } from "@/components/ui/FormAcao";
import type { EstadoForm } from "@/app/admin/acoes";

type Acao = (anterior: EstadoForm, form: FormData) => Promise<EstadoForm>;

export function FormCriarDono({ acao }: { acao: Acao }) {
  return (
    <FormAcao acao={acao}>
      {(estado, enviando) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo id="dono-email" name="email" type="email" rotulo="E-mail do dono" autoComplete="off" erro={estado.erros?.email} />
            <Campo
              id="dono-senha"
              name="senha"
              type="text"
              rotulo="Senha inicial"
              autoComplete="new-password"
              ajuda="Mínimo de 8 caracteres. Passe ao dono pessoalmente."
              erro={estado.erros?.senha}
            />
          </div>
          <Botao type="submit" variante="secundario" disabled={enviando} className="self-start">
            {enviando ? "Criando…" : "Criar login do dono"}
          </Botao>
        </>
      )}
    </FormAcao>
  );
}

export function FormRedefinirSenha({ acao, email }: { acao: Acao; email: string }) {
  return (
    <FormAcao acao={acao}>
      {(estado, enviando) => (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Campo
              id={`senha-${email.replace(/[^a-z0-9]/gi, "-")}`}
              name="senha"
              type="text"
              rotulo={`Nova senha para ${email}`}
              autoComplete="new-password"
              erro={estado.erros?.senha}
            />
          </div>
          <Botao type="submit" variante="secundario" disabled={enviando}>
            {enviando ? "Salvando…" : "Redefinir senha"}
          </Botao>
        </div>
      )}
    </FormAcao>
  );
}

export function FormAnonimizar({ acao }: { acao: Acao }) {
  return (
    <FormAcao acao={acao}>
      {(estado, enviando) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              id="anon-busca"
              name="busca"
              rotulo="Código do cartão ou telefone"
              autoComplete="off"
              erro={estado.erros?.busca}
            />
            <Campo
              id="anon-confirmacao"
              name="confirmacao"
              rotulo="Digite APAGAR para confirmar"
              autoComplete="off"
              autoCapitalize="characters"
              erro={estado.erros?.confirmacao}
            />
          </div>
          <Botao type="submit" variante="secundario" disabled={enviando} className="self-start">
            {enviando ? "Apagando…" : "Apagar dados do cliente"}
          </Botao>
        </>
      )}
    </FormAcao>
  );
}
