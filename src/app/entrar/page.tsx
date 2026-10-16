import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { inicioDoPerfil, obterSessao } from "@/lib/auth";
import { FormLogin } from "./FormLogin";

export const metadata: Metadata = { title: "Entrar" };

const AVISOS: Record<string, string> = {
  "sem-perfil": "Este login ainda não está ligado a nenhum estabelecimento. Fale com a Bicuíra.",
};

export default async function Entrar({ searchParams }: PageProps<"/entrar">) {
  const params = await searchParams;
  const sessao = await obterSessao();
  if (sessao) redirect(inicioDoPerfil(sessao));

  const volta = typeof params.volta === "string" ? params.volta : undefined;
  const erro = typeof params.erro === "string" ? AVISOS[params.erro] : undefined;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-5 py-10">
      <div>
        <p className="font-semibold text-restinga">Bicuíra Fideliza</p>
        <h1 className="font-display text-4xl text-restinga">Entrar no painel</h1>
      </div>
      <FormLogin volta={volta} avisoInicial={erro} />
      <p className="text-sm text-carvao/80">
        Esqueceu a senha? Fale com a equipe Bicuíra para redefinir.
      </p>
    </main>
  );
}
