"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { atualizarWalletDoEstabelecimento } from "@/lib/wallet";
import { redirect } from "next/navigation";
import { exigirSuperAdmin } from "@/lib/auth";
import { registrarAuditoria } from "@/lib/auditoria";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServidor } from "@/lib/supabase/servidor";
import { lerReais } from "@/lib/dominio/dinheiro";
import { validarEstabelecimento, type DadosEstabelecimento, type ErrosForm } from "@/lib/dominio/estabelecimento";
import { carregarEstabelecimento, donosDoEstabelecimento } from "@/lib/admin/dados";

export type EstadoForm = { erros?: ErrosForm; mensagem?: string; ok?: boolean };

const TIPOS_LOGO: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

function texto(form: FormData, campo: string) {
  return String(form.get(campo) ?? "").trim();
}
function inteiro(form: FormData, campo: string) {
  const v = texto(form, campo);
  return /^\d+$/.test(v) ? Number(v) : NaN;
}
function opcional(form: FormData, campo: string) {
  return texto(form, campo) || null;
}

function lerFormulario(form: FormData): DadosEstabelecimento {
  return {
    nome: texto(form, "nome"),
    slug: texto(form, "slug").toLowerCase(),
    cor_primaria: texto(form, "cor_primaria").toUpperCase(),
    cor_secundaria: texto(form, "cor_secundaria").toUpperCase(),
    gasto_minimo_centavos: lerReais(texto(form, "gasto_minimo")) ?? NaN,
    dias_inatividade: inteiro(form, "dias_inatividade"),
    max_personalizadas_semana: inteiro(form, "max_personalizadas_semana"),
    contato_privacidade: opcional(form, "contato_privacidade"),
    ativo: form.get("ativo") === "on",
    cobranca_plano: opcional(form, "cobranca_plano"),
    cobranca_status: opcional(form, "cobranca_status"),
    cobranca_vencimento: opcional(form, "cobranca_vencimento"),
    morador: {
      ativo: form.get("morador_ativo") === "on",
      carimbos_meta: inteiro(form, "morador_meta"),
      recompensa_texto: texto(form, "morador_recompensa"),
    },
    turista: {
      ativo: form.get("turista_ativo") === "on",
      carimbos_meta: inteiro(form, "turista_meta"),
      recompensa_texto: texto(form, "turista_recompensa"),
    },
  };
}

/** Cria (sem id) ou atualiza um estabelecimento com seus dois planos e a logo. */
export async function salvarEstabelecimento(
  id: string | null,
  _anterior: EstadoForm,
  form: FormData,
): Promise<EstadoForm> {
  const sessao = await exigirSuperAdmin();
  const dados = lerFormulario(form);
  const erros = validarEstabelecimento(dados);

  const logo = form.get("logo");
  const temLogo = logo instanceof File && logo.size > 0;
  if (temLogo) {
    if (!TIPOS_LOGO[logo.type]) erros.logo = "Envie PNG, JPG ou WebP.";
    else if (logo.size > 2 * 1024 * 1024) erros.logo = "A imagem precisa ter até 2 MB.";
  }
  if (Object.keys(erros).length > 0) return { erros, mensagem: "Confira os campos destacados." };

  const supabase = await supabaseServidor();
  const { morador, turista, ...estab } = dados;
  const antes = id ? await carregarEstabelecimento(id) : null;

  let estabelecimentoId = id;
  if (id) {
    const { error } = await supabase.from("estabelecimentos").update(estab).eq("id", id);
    if (error) return erroBanco(error);
  } else {
    const { data, error } = await supabase.from("estabelecimentos").insert(estab).select("id").single();
    if (error) return erroBanco(error);
    estabelecimentoId = data.id;
  }

  for (const [tipo, plano] of [["morador", morador], ["turista", turista]] as const) {
    const { error } = await supabase
      .from("planos")
      .upsert({ estabelecimento_id: estabelecimentoId, tipo, ...plano }, { onConflict: "estabelecimento_id,tipo" });
    if (error) return erroBanco(error);
  }

  if (temLogo) {
    const caminho = `${estabelecimentoId}/logo-${Date.now()}.${TIPOS_LOGO[logo.type]}`;
    const { error } = await supabaseAdmin()
      .storage.from("logos")
      .upload(caminho, Buffer.from(await logo.arrayBuffer()), { contentType: logo.type, upsert: true });
    if (error) return { mensagem: `Os dados foram salvos, mas a logo não: ${error.message}` };
    await supabase.from("estabelecimentos").update({ logo_path: caminho }).eq("id", estabelecimentoId);
  }

  await registrarAuditoria({
    acao: id ? "estabelecimento.editar" : "estabelecimento.criar",
    userId: sessao.userId,
    estabelecimentoId,
    alvoTipo: "estabelecimento",
    alvoId: estabelecimentoId!,
    antes,
    depois: { ...dados, logo_alterada: temLogo },
  });

  if (id) {
    // nome, logo, cores ou regras mudaram: os cartões no Wallet precisam ser atualizados
    const admin = supabaseAdmin();
    const { data: passes } = await admin.from("passes").select("cliente_id, versao").eq("estabelecimento_id", id);
    for (const p of passes ?? []) {
      await admin.from("passes").update({ versao: p.versao + 1, atualizado_em: new Date().toISOString() }).eq("cliente_id", p.cliente_id);
    }
    after(() => atualizarWalletDoEstabelecimento((passes ?? []).map((p) => p.cliente_id)));
  }

  revalidatePath("/admin");
  if (!id) redirect(`/admin/${estabelecimentoId}?criado=1`);
  revalidatePath(`/admin/${id}`);
  return { ok: true, mensagem: "Alterações salvas." };
}

function erroBanco(error: { code?: string; message: string }): EstadoForm {
  if (error.code === "23505") return { erros: { slug: "Esse endereço já está em uso." }, mensagem: "Confira os campos destacados." };
  return { mensagem: `Não foi possível salvar: ${error.message}` };
}

/** Cria o login do dono (e-mail + senha inicial) e liga ao estabelecimento. */
export async function criarLoginDono(estabelecimentoId: string, _a: EstadoForm, form: FormData): Promise<EstadoForm> {
  const sessao = await exigirSuperAdmin();
  const email = texto(form, "email").toLowerCase();
  const senha = String(form.get("senha") ?? "");
  const erros: ErrosForm = {};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) erros.email = "Informe um e-mail válido.";
  if (senha.length < 8) erros.senha = "A senha precisa ter pelo menos 8 caracteres.";
  if (Object.keys(erros).length) return { erros };

  if (!(await carregarEstabelecimento(estabelecimentoId))) return { mensagem: "Estabelecimento não encontrado." };

  const admin = supabaseAdmin();
  const { data, error } = await admin.auth.admin.createUser({ email, password: senha, email_confirm: true });
  if (error || !data.user) {
    const jaExiste = /already|registered|exists/i.test(error?.message ?? "");
    return { erros: { email: jaExiste ? "Já existe um login com esse e-mail." : `Erro: ${error?.message}` } };
  }

  const { error: erroPerfil } = await admin
    .from("perfis")
    .insert({ user_id: data.user.id, papel: "dono", estabelecimento_id: estabelecimentoId });
  if (erroPerfil) {
    await admin.auth.admin.deleteUser(data.user.id);
    return { mensagem: `Não foi possível ligar o login: ${erroPerfil.message}` };
  }

  await registrarAuditoria({
    acao: "dono.criar_login",
    userId: sessao.userId,
    estabelecimentoId,
    alvoTipo: "usuario",
    alvoId: data.user.id,
    depois: { email },
  });
  // a seção passa a mostrar o login criado; o aviso vem pela URL
  redirect(`/admin/${estabelecimentoId}?dono=criado`);
}

/** Define uma nova senha para o dono (ele esqueceu, ou na entrega do sistema). */
export async function redefinirSenhaDono(
  estabelecimentoId: string,
  userId: string,
  _a: EstadoForm,
  form: FormData,
): Promise<EstadoForm> {
  const sessao = await exigirSuperAdmin();
  const senha = String(form.get("senha") ?? "");
  if (senha.length < 8) return { erros: { senha: "A senha precisa ter pelo menos 8 caracteres." } };

  const donos = await donosDoEstabelecimento(estabelecimentoId);
  if (!donos.some((d) => d.userId === userId)) return { mensagem: "Esse login não pertence a este estabelecimento." };

  const { error } = await supabaseAdmin().auth.admin.updateUserById(userId, { password: senha });
  if (error) return { mensagem: `Não foi possível trocar a senha: ${error.message}` };

  await registrarAuditoria({
    acao: "dono.redefinir_senha",
    userId: sessao.userId,
    estabelecimentoId,
    alvoTipo: "usuario",
    alvoId: userId,
  });
  return { ok: true, mensagem: "Senha redefinida. Passe a nova senha ao dono." };
}

/**
 * LGPD: apaga os dados pessoais de um cliente (nome e telefone) e o cartão no Wallet.
 * As visitas continuam, sem identificar a pessoa, para não distorcer as métricas.
 */
export async function anonimizarCliente(estabelecimentoId: string, _a: EstadoForm, form: FormData): Promise<EstadoForm> {
  const sessao = await exigirSuperAdmin();
  const busca = texto(form, "busca");
  const confirmacao = texto(form, "confirmacao").toUpperCase();
  if (!busca) return { erros: { busca: "Informe o código do cartão ou o telefone." } };
  if (confirmacao !== "APAGAR") return { erros: { confirmacao: "Digite APAGAR para confirmar." } };

  const admin = supabaseAdmin();
  const digitos = busca.replace(/\D/g, "");
  const telefone = digitos.length >= 10 ? `+55${digitos.slice(-11)}` : null;
  const codigo = busca.toUpperCase();
  let consulta = admin
    .from("clientes")
    .select("id, nome, codigo, telefone")
    .eq("estabelecimento_id", estabelecimentoId)
    .is("anonimizado_em", null);
  consulta = telefone ? consulta.eq("telefone", telefone) : consulta.eq("codigo", codigo);
  const { data: cliente } = await consulta.maybeSingle();
  if (!cliente) return { erros: { busca: "Nenhum cliente ativo encontrado com esse código ou telefone." } };

  const { error } = await admin
    .from("clientes")
    .update({
      nome: "Cliente removido",
      telefone: null,
      anonimizado_em: new Date().toISOString(),
      token_cartao: randomBytes(24).toString("hex"), // o link antigo do cartão web deixa de funcionar
    })
    .eq("id", cliente.id);
  if (error) return { mensagem: `Não foi possível apagar: ${error.message}` };
  await admin.from("passes").delete().eq("cliente_id", cliente.id);

  await registrarAuditoria({
    acao: "cliente.anonimizar",
    userId: sessao.userId,
    estabelecimentoId,
    alvoTipo: "cliente",
    alvoId: cliente.id,
    antes: { codigo: cliente.codigo },
  });
  return { ok: true, mensagem: `Dados do cliente ${cliente.codigo} apagados.` };
}
