import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseServidor } from "@/lib/supabase/servidor";

export type Estabelecimento = {
  id: string;
  slug: string;
  nome: string;
  ativo: boolean;
};

export type Sessao =
  | { papel: "super_admin"; userId: string; email: string }
  | { papel: "dono"; userId: string; email: string; estabelecimento: Estabelecimento };

/** Lê o login atual e o perfil (uma vez por requisição). `null` = sem login ou sem perfil. */
export const obterSessao = cache(async (): Promise<Sessao | null> => {
  const supabase = await supabaseServidor();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return null;
  return carregarPerfil(supabase, userId, String(claims.claims.email ?? ""));
});

/** Busca o perfil do login com o próprio cliente da requisição (o RLS só deixa ler o seu). */
export async function carregarPerfil(supabase: SupabaseClient, userId: string, email: string): Promise<Sessao | null> {
  const { data: perfil } = await supabase
    .from("perfis")
    .select("papel, estabelecimento:estabelecimentos (id, slug, nome, ativo)")
    .eq("user_id", userId)
    .maybeSingle();
  if (!perfil) return null;

  if (perfil.papel === "super_admin") return { papel: "super_admin", userId, email };

  const estabelecimento = perfil.estabelecimento as unknown as Estabelecimento | null;
  if (!estabelecimento) return null;
  return { papel: "dono", userId, email, estabelecimento };
}

/** Página inicial de cada perfil depois do login. */
export function inicioDoPerfil(sessao: Sessao) {
  return sessao.papel === "super_admin" ? "/admin" : "/painel";
}

export async function exigirDono() {
  const sessao = await obterSessao();
  if (!sessao) redirect("/entrar?erro=sem-perfil");
  if (sessao.papel !== "dono") redirect(inicioDoPerfil(sessao));
  return sessao;
}

export async function exigirSuperAdmin() {
  const sessao = await obterSessao();
  if (!sessao) redirect("/entrar?erro=sem-perfil");
  // logado como dono: não leva ao painel dele sem avisar; mostra que é preciso trocar de login
  if (sessao.papel !== "super_admin") redirect("/entrar?trocar=admin");
  return sessao;
}
