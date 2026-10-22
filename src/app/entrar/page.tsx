import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { inicioDoPerfil, obterSessao } from "@/lib/auth";
import { FormLogin } from "./FormLogin";
import { sair } from "./acoes";
import { Botao } from "@/components/ui/Botao";

export const metadata: Metadata = { title: "Entrar" };

const AVISOS: Record<string, string> = {
  "sem-perfil": "Este login ainda não está ligado a nenhum estabelecimento. Fale com a Bicuíra.",
};

export default async function Entrar({ searchParams }: PageProps<"/entrar">) {
  const params = await searchParams;
  const sessao = await obterSessao();
  if (sessao?.papel === "dono" && params.trocar === "admin") {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-5 py-10">
        <div>
          <p className="font-semibold text-restinga">Bicuíra Fideliza</p>
          <h1 className="font-display text-4xl text-restinga">Painel da Bicuíra</h1>
        </div>
        <p className="text-lg">
          Este navegador está com o login do dono de <strong>{sessao.estabelecimento.nome}</strong> ({sessao.email}). Para ver todos os
          estabelecimentos, saia e entre com a conta de admin.
        </p>
        <form action={sair}>
          <Botao type="submit" grande className="w-full">
            Sair e entrar como admin
          </Botao>
        </form>
        <p className="text-sm text-carvao/80">Dica: para testar o painel de um dono, use uma janela anônima e mantenha o admin nesta.</p>
      </main>
    );
  }
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
