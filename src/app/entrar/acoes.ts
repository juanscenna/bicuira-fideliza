"use server";

import { redirect } from "next/navigation";
import { supabaseServidor } from "@/lib/supabase/servidor";
import { carregarPerfil, inicioDoPerfil, obterSessao } from "@/lib/auth";
import { registrarAuditoria } from "@/lib/auditoria";

export type EstadoLogin = { erro?: string; email?: string };

export async function entrar(_anterior: EstadoLogin, form: FormData): Promise<EstadoLogin> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const senha = String(form.get("senha") ?? "");
  if (!email || !senha) return { erro: "Preencha e-mail e senha.", email };

  const supabase = await supabaseServidor();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error || !data.user) {
    return { erro: "E-mail ou senha incorretos.", email };
  }

  const sessao = await carregarPerfil(supabase, data.user.id, email);
  if (!sessao) {
    await supabase.auth.signOut();
    return { erro: "Este login ainda não está ligado a nenhum estabelecimento. Fale com a Bicuíra.", email };
  }

  await registrarAuditoria({
    acao: "login",
    userId: sessao.userId,
    estabelecimentoId: sessao.papel === "dono" ? sessao.estabelecimento.id : null,
  });

  const volta = String(form.get("volta") ?? "");
  const destino = inicioDoPerfil(sessao);
  redirect(volta.startsWith(destino) ? volta : destino);
}

export async function sair() {
  const sessao = await obterSessao();
  const supabase = await supabaseServidor();
  await supabase.auth.signOut();
  if (sessao) {
    await registrarAuditoria({
      acao: "logout",
      userId: sessao.userId,
      estabelecimentoId: sessao.papel === "dono" ? sessao.estabelecimento.id : null,
    });
  }
  redirect("/entrar");
}
