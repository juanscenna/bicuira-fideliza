import "server-only";
import { createSign } from "node:crypto";
import { GoogleAuth } from "google-auth-library";
import { SITE_URL } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { googleConfigurado } from "./config";
import { progresso, regras, statusRecompensa } from "./conteudo";
import type { DadosPass } from "./dados";

const API = "https://walletobjects.googleapis.com/walletobjects/v1";

type ContaServico = { client_email: string; private_key: string };

function conta(): ContaServico {
  return JSON.parse(Buffer.from(process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_BASE64 ?? "", "base64").toString("utf8"));
}

const emissor = () => process.env.GOOGLE_WALLET_ISSUER_ID!;
export const idClasse = (estabelecimentoId: string, issuer = emissor()) => `${issuer}.estab_${estabelecimentoId.replace(/-/g, "")}`;
export const idObjeto = (clienteId: string, issuer = emissor()) => `${issuer}.cliente_${clienteId.replace(/-/g, "")}`;

let auth: GoogleAuth | null = null;
function cliente() {
  auth ??= new GoogleAuth({ credentials: conta(), scopes: ["https://www.googleapis.com/auth/wallet_object.issuer"] });
  return auth;
}

async function chamar<T>(metodo: "GET" | "POST" | "PATCH", caminho: string, corpo?: unknown) {
  const c = await cliente().getClient();
  return c.request<T>({ url: `${API}${caminho}`, method: metodo, data: corpo, validateStatus: () => true });
}

/** Loyalty Class: uma por estabelecimento (nome, logo e cor). */
export function montarClasse(d: DadosPass, issuer = emissor()) {
  const logo = d.logoUrl ?? `${SITE_URL}/${d.slug}/icone/512`;
  return {
    id: idClasse(d.estabelecimentoId, issuer),
    issuerName: d.estabelecimento,
    programName: "Cartão fidelidade",
    programLogo: { sourceUri: { uri: logo }, contentDescription: { defaultValue: { language: "pt-BR", value: d.estabelecimento } } },
    hexBackgroundColor: d.corPrimaria,
    reviewStatus: "UNDER_REVIEW",
    countryCode: "BR",
    multipleDevicesAndHoldersAllowedStatus: "ONE_USER_ALL_DEVICES",
  };
}

/** Loyalty Object: um por cliente. */
export function montarObjeto(d: DadosPass, issuer = emissor()) {
  return {
    id: idObjeto(d.clienteId, issuer),
    classId: idClasse(d.estabelecimentoId, issuer),
    state: "ACTIVE",
    accountId: d.codigo,
    accountName: d.nome,
    loyaltyPoints: { label: "Selos", balance: { string: progresso(d) } },
    secondaryLoyaltyPoints: { label: "Recompensa", balance: { string: statusRecompensa(d) } },
    // faixa com os selos (logo do restaurante), gerada em /api/wallet/selos; a URL muda a cada selo
    heroImage: {
      sourceUri: { uri: `${SITE_URL}/api/wallet/selos/${d.slug}/${d.carimbos}-${d.meta}.png` },
      contentDescription: { defaultValue: { language: "pt-BR", value: `${d.carimbos} de ${d.meta} selos` } },
    },
    hexBackgroundColor: d.corPrimaria,
    barcode: { type: "QR_CODE", value: d.codigo, alternateText: d.codigo },
    textModulesData: [
      { id: "regras", header: "Como funciona", body: regras(d) },
      { id: "bicuira", header: "Tecnologia", body: "por Bicuíra Digital" },
    ],
    linksModuleData: {
      uris: [
        { id: "cartao", uri: d.urlCartao, description: "Cartão no navegador" },
        { id: "privacidade", uri: d.urlPrivacidade, description: "Política de privacidade" },
      ],
    },
  };
}

/** Cria a classe do estabelecimento se ainda não existir; senão, atualiza nome/logo/cor. */
async function garantirClasse(d: DadosPass) {
  const classe = montarClasse(d);
  const r = await chamar("GET", `/loyaltyClass/${encodeURIComponent(classe.id)}`);
  if (r.status === 404) {
    const novo = await chamar("POST", "/loyaltyClass", classe);
    if (novo.status >= 300) throw new Error(`Google Wallet: classe ${novo.status} ${JSON.stringify(novo.data)}`);
  } else if (r.status < 300) {
    const semRevisao: Partial<typeof classe> = { ...classe };
    delete semRevisao.reviewStatus; // a revisão só é pedida na criação
    await chamar("PATCH", `/loyaltyClass/${encodeURIComponent(classe.id)}`, semRevisao);
  } else throw new Error(`Google Wallet: classe ${r.status}`);
}

function base64url(dados: string | Buffer) {
  return Buffer.from(dados).toString("base64url");
}

/** Link "Salvar no Google Wallet": JWT assinado pela conta de serviço, com o objeto completo dentro. */
export async function linkSalvarGoogle(d: DadosPass) {
  await garantirClasse(d);
  const c = conta();
  const objeto = montarObjeto(d);
  const cabecalho = { alg: "RS256", typ: "JWT" };
  const corpo = {
    iss: c.client_email,
    aud: "google",
    typ: "savetowallet",
    iat: Math.floor(Date.now() / 1000),
    origins: [SITE_URL],
    payload: { loyaltyObjects: [objeto] },
  };
  const conteudo = `${base64url(JSON.stringify(cabecalho))}.${base64url(JSON.stringify(corpo))}`;
  const assinatura = createSign("RSA-SHA256").update(conteudo).sign(c.private_key);
  await supabaseAdmin().from("passes").update({ google_object_id: objeto.id }).eq("cliente_id", d.clienteId);
  return `https://pay.google.com/gp/v/save/${conteudo}.${base64url(assinatura)}`;
}

/** Atualiza o objeto do cliente (só se ele já salvou o cartão no Google Wallet). */
export async function atualizarObjetoGoogle(d: DadosPass) {
  if (!d.googleObjectId) return;
  if (!googleConfigurado()) {
    console.info(`[wallet:google] modo de teste: atualização do objeto ${d.googleObjectId} registrada`);
    return;
  }
  const r = await chamar("PATCH", `/loyaltyObject/${encodeURIComponent(d.googleObjectId)}`, montarObjeto(d));
  if (r.status >= 300 && r.status !== 404) console.error("[wallet:google] atualizar", r.status, JSON.stringify(r.data));
}

/**
 * Mensagem no cartão. Com notificar=true usa TEXT_AND_NOTIFY (o Google limita a 3 por cartão a cada 24 h);
 * se o limite estourar, a mensagem entra sem notificação.
 */
export async function mensagemGoogle(d: DadosPass, texto: string, notificar: boolean): Promise<"notificado" | "sem_notificacao" | "nao_salvo" | "modo_teste" | "erro"> {
  if (!d.googleObjectId) return "nao_salvo";
  if (!googleConfigurado()) {
    console.info(`[wallet:google] modo de teste: mensagem para ${d.googleObjectId}: ${texto}`);
    return "modo_teste";
  }
  const enviar = (tipo: "TEXT" | "TEXT_AND_NOTIFY") =>
    chamar("POST", `/loyaltyObject/${encodeURIComponent(d.googleObjectId!)}/addMessage`, {
      message: { id: `msg_${Date.now()}`, header: d.estabelecimento, body: texto, messageType: tipo },
    });
  if (notificar) {
    const r = await enviar("TEXT_AND_NOTIFY");
    if (r.status < 300) return "notificado";
    if (r.status === 404) return "nao_salvo";
    if (r.status !== 429 && !/quota/i.test(JSON.stringify(r.data))) {
      console.error("[wallet:google] mensagem", r.status, JSON.stringify(r.data));
      return "erro";
    }
  }
  const r = await enviar("TEXT");
  return r.status < 300 ? "sem_notificacao" : r.status === 404 ? "nao_salvo" : "erro";
}
