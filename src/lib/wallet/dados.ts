import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { TEMAS, temaDo } from "@/temas/config";
import { SITE_URL } from "@/lib/env";

/** Tudo o que um cartão de Wallet precisa mostrar (Apple e Google usam a mesma fonte). */
export type DadosPass = {
  clienteId: string;
  estabelecimentoId: string;
  slug: string;
  estabelecimento: string;
  logoUrl: string | null;
  corPrimaria: string;
  corSecundaria: string;
  nome: string;
  codigo: string;
  plano: "morador" | "turista";
  carimbos: number;
  meta: number;
  recompensa: string;
  gastoMinimoCentavos: number;
  serial: string;
  appleAuthToken: string;
  googleObjectId: string | null;
  versao: number;
  atualizadoEm: string;
  mensagem: string | null;
  urlCartao: string;
  urlPrivacidade: string;
};

const CAMPOS =
  "id, nome, codigo, plano_tipo, carimbos_atuais, token_cartao, anonimizado_em, estabelecimento_id, " +
  "estabelecimentos (slug, nome, logo_path, cor_primaria, cor_secundaria, gasto_minimo_centavos, ativo), " +
  "passes (serial, apple_auth_token, google_object_id, versao, atualizado_em, mensagem_atual)";

type Linha = {
  id: string;
  nome: string;
  codigo: string;
  plano_tipo: "morador" | "turista";
  carimbos_atuais: number;
  token_cartao: string;
  anonimizado_em: string | null;
  estabelecimento_id: string;
  estabelecimentos: { slug: string; nome: string; logo_path: string | null; cor_primaria: string; cor_secundaria: string; gasto_minimo_centavos: number; ativo: boolean };
  passes: PassLinha | PassLinha[] | null;
};
type PassLinha = { serial: string; apple_auth_token: string; google_object_id: string | null; versao: number; atualizado_em: string; mensagem_atual: string | null };

async function montar(linha: Linha | null): Promise<DadosPass | null> {
  // a relação 1–1 pode vir como objeto ou como lista, conforme a versão do PostgREST
  const p = Array.isArray(linha?.passes) ? linha.passes[0] : linha?.passes;
  if (!linha || linha.anonimizado_em || !p) return null;
  const { data: plano } = await supabaseAdmin()
    .from("planos")
    .select("carimbos_meta, recompensa_texto")
    .eq("estabelecimento_id", linha.estabelecimento_id)
    .eq("tipo", linha.plano_tipo)
    .single();
  const e = linha.estabelecimentos;
  const meta = plano?.carimbos_meta ?? 10;
  return {
    clienteId: linha.id,
    estabelecimentoId: linha.estabelecimento_id,
    slug: e.slug,
    estabelecimento: e.nome,
    logoUrl: TEMAS[temaDo(e.slug)].logoUrl,
    corPrimaria: TEMAS[temaDo(e.slug)].cor_primaria,
    corSecundaria: TEMAS[temaDo(e.slug)].cor_secundaria,
    nome: linha.nome,
    codigo: linha.codigo,
    plano: linha.plano_tipo,
    carimbos: Math.min(linha.carimbos_atuais, meta),
    meta,
    recompensa: plano?.recompensa_texto ?? "",
    gastoMinimoCentavos: e.gasto_minimo_centavos,
    serial: p.serial,
    appleAuthToken: p.apple_auth_token,
    googleObjectId: p.google_object_id,
    versao: p.versao,
    atualizadoEm: p.atualizado_em,
    mensagem: p.mensagem_atual,
    urlCartao: `${SITE_URL}/${e.slug}/cartao/${linha.token_cartao}`,
    urlPrivacidade: `${SITE_URL}/${e.slug}/privacidade`,
  };
}

export async function dadosPorCliente(clienteId: string) {
  const { data } = await supabaseAdmin().from("clientes").select(CAMPOS).eq("id", clienteId).maybeSingle();
  return montar(data as unknown as Linha | null);
}

/** Pelo token do cartão web, conferindo o endereço do estabelecimento. */
export async function dadosPorToken(token: string, slug: string) {
  if (!/^[0-9a-f]{48}$/.test(token)) return null;
  const { data } = await supabaseAdmin().from("clientes").select(CAMPOS).eq("token_cartao", token).maybeSingle();
  const d = await montar(data as unknown as Linha | null);
  return d && d.slug === slug ? d : null;
}

/** Pelo número de série do pass (web service da Apple). */
export async function dadosPorSerial(serial: string) {
  const { data: pass } = await supabaseAdmin().from("passes").select("cliente_id").eq("serial", serial).maybeSingle();
  return pass ? dadosPorCliente(pass.cliente_id) : null;
}
