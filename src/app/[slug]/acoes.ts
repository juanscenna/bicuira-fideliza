"use server";

import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { origemDaRequisicao } from "@/lib/auditoria";
import { normalizarTelefone } from "@/lib/dominio/telefone";
import { googleConfigurado, walletVisivel } from "@/lib/wallet/config";
import { dadosPorToken } from "@/lib/wallet/dados";
import { linkSalvarGoogle } from "@/lib/wallet/google";

export type EstadoCadastro = {
  erros?: Partial<Record<"nome" | "telefone" | "plano" | "consentimento", string>>;
  mensagem?: string;
  /** Android: o formulário leva direto ao Google Wallet (url) e deixa o cartão web (cartao) no histórico */
  wallet?: { url: string; cartao: string; token: string };
};

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
    p_aceita_novidades: form.get("novidades") === "on",
  });
  if (error || !data) {
    console.error("[cadastro]", error?.message);
    return { mensagem: "Não foi possível criar o cartão agora. Tente novamente em instantes." };
  }

  const r = data as { status: string; token?: string };
  if ((r.status === "criado" || r.status === "existente") && r.token && form.get("android") === "1") {
    const wallet = await linkDireto(slug, r.token, r.status === "criado" ? "novo" : "recuperado");
    if (wallet) return { wallet };
  }
  if (r.status === "criado") redirect(`/${slug}/cartao/${r.token}?novo=1`);
  if (r.status === "existente") redirect(`/${slug}/cartao/${r.token}?recuperado=1`);
  if (r.status === "inativo") return { mensagem: "O programa de fidelidade deste estabelecimento está pausado." };
  if (r.status === "plano_invalido") return { erros: { plano: "Escolha uma das opções." } };
  return { mensagem: "Estabelecimento não encontrado." };
}

/**
 * Link "Salvar no Google Wallet" já pronto na resposta do formulário. O Chrome do Android só abre o app
 * do Wallet quando a navegação vem logo depois de um toque; por isso o próprio toque em "Criar meu cartão"
 * leva ao Google, sem passar antes pela página do cartão. Se algo falhar, segue o caminho normal (página do cartão).
 */
async function linkDireto(slug: string, token: string, status: "novo" | "recuperado") {
  if (!walletVisivel() || !googleConfigurado()) return null;
  try {
    const d = await dadosPorToken(token, slug);
    if (!d) return null;
    return { url: await linkSalvarGoogle(d), cartao: `/${slug}/cartao/${token}?${status}=1`, token };
  } catch (erro) {
    console.error("[wallet:google] link no cadastro", erro);
    return null;
  }
}

export type EstadoAbrir = { erro?: string };

/** "Já tenho cartão": abre o cartão pelo celular (mesma regra do cadastro com telefone já usado). */
export async function abrirCartao(slug: string, _anterior: EstadoAbrir, form: FormData): Promise<EstadoAbrir> {
  const telefone = normalizarTelefone(String(form.get("telefone") ?? ""));
  if (!telefone) return { erro: "Confira o número: DDD + celular com 9 dígitos." };

  const { ipHash } = await origemDaRequisicao();
  const admin = supabaseAdmin();
  const { data: permitido } = await admin.rpc("consumir_limite", {
    p_chave: `abrir:${slug}:${ipHash ?? "sem-ip"}`,
    p_maximo: LIMITE_POR_IP,
    p_janela_segundos: JANELA_SEGUNDOS,
  });
  if (permitido === false) return { erro: "Muitas tentativas seguidas. Espere alguns minutos e tente de novo." };

  const { data: estab } = await admin.from("estabelecimentos").select("id").eq("slug", slug).eq("ativo", true).maybeSingle();
  if (!estab) return { erro: "Estabelecimento não encontrado." };
  const { data: cliente } = await admin
    .from("clientes")
    .select("token_cartao")
    .eq("estabelecimento_id", estab.id)
    .eq("telefone", telefone)
    .is("anonimizado_em", null)
    .maybeSingle();
  if (!cliente) return { erro: "Não achamos um cartão com esse celular. Crie o seu logo abaixo — leva 30 segundos." };
  redirect(`/${slug}/cartao/${cliente.token_cartao}?recuperado=1`);
}
