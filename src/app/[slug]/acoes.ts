"use server";

import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { origemDaRequisicao } from "@/lib/auditoria";
import { normalizarTelefone } from "@/lib/dominio/telefone";

export type EstadoCadastro = { erros?: Partial<Record<"nome" | "telefone" | "plano" | "consentimento", string>>; mensagem?: string };

// Muita gente usa o Wi-Fi do restaurante (mesmo IP): limite generoso, só para barrar robôs.
const LIMITE_POR_IP = 30;
const JANELA_SEGUNDOS = 10 * 60;

export async function cadastrar(slug: string, _anterior: EstadoCadastro, form: FormData): Promise<EstadoCadastro> {
  // honeypot: campo invisível que só robôs preenchem
  if (String(form.get("site") ?? "") !== "") return { mensagem: "Não foi possível concluir. Tente novamente." };

  const nome = String(form.get("nome") ?? "").replace(/\s+/g, " ").trim();
  const telefone = normalizarTelefone(String(form.get("telefone") ?? ""));
  const plano = String(form.get("plano") ?? "");
  const precisaPlano = form.get("precisa_plano") === "1";

  const erros: EstadoCadastro["erros"] = {};
  if (nome.length < 2 || nome.length > 60) erros.nome = "Digite seu nome (2 a 60 letras).";
  if (!telefone) erros.telefone = "Confira o número: DDD + celular com 9 dígitos. Ex.: (48) 99999-0001";
  if (precisaPlano && plano !== "morador" && plano !== "turista") erros.plano = "Escolha uma das opções.";
  if (form.get("consentimento") !== "on") erros.consentimento = "Para criar o cartão, é preciso concordar.";
  if (Object.keys(erros).length) return { erros };

  const { ipHash } = await origemDaRequisicao();
  const admin = supabaseAdmin();
  const { data: permitido } = await admin.rpc("consumir_limite", {
    p_chave: `cadastro:${slug}:${ipHash ?? "sem-ip"}`,
    p_maximo: LIMITE_POR_IP,
    p_janela_segundos: JANELA_SEGUNDOS,
  });
  if (permitido === false) return { mensagem: "Muitas tentativas seguidas. Espere alguns minutos e tente de novo." };

  const { data, error } = await admin.rpc("cadastrar_cliente", {
    p_slug: slug,
    p_nome: nome,
    p_telefone: telefone,
    p_plano: plano || "morador",
    p_ip_hash: ipHash,
  });
  if (error || !data) {
    console.error("[cadastro]", error?.message);
    return { mensagem: "Não foi possível criar o cartão agora. Tente novamente em instantes." };
  }

  const r = data as { status: string; token?: string };
  if (r.status === "criado") redirect(`/${slug}/cartao/${r.token}?novo=1`);
  if (r.status === "existente") redirect(`/${slug}/cartao/${r.token}?recuperado=1`);
  if (r.status === "inativo") return { mensagem: "O programa de fidelidade deste estabelecimento está pausado." };
  if (r.status === "plano_invalido") return { erros: { plano: "Escolha uma das opções." } };
  return { mensagem: "Estabelecimento não encontrado." };
}
