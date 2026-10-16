import "server-only";
import http2 from "node:http2";
import { PKPass } from "passkit-generator";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/env";
import { textoSobre } from "@/lib/tema";
import { appleConfigurado } from "./config";
import { progresso, regras, rgb, statusRecompensa } from "./conteudo";
import type { DadosPass } from "./dados";
import { imagensDoPass } from "./imagens";

const b64 = (v: string | undefined) => Buffer.from(v ?? "", "base64");

function credenciais() {
  return {
    passTypeId: process.env.APPLE_PASS_TYPE_ID!,
    teamId: process.env.APPLE_TEAM_ID!,
    cert: b64(process.env.APPLE_PASS_CERT_BASE64),
    key: b64(process.env.APPLE_PASS_KEY_BASE64),
    passphrase: process.env.APPLE_PASS_KEY_PASSPHRASE || undefined,
    wwdr: b64(process.env.APPLE_WWDR_CERT_BASE64),
  };
}

/** Endereço do web service que o iPhone chama para buscar atualizações (precisa ser HTTPS em produção). */
export const URL_WEB_SERVICE = `${SITE_URL}/api/wallet/apple`;

/** Conteúdo do pass.json (storeCard). Separado para poder testar sem certificados. */
export function montarPassJson(d: DadosPass, ids: { passTypeId: string; teamId: string }) {
  const texto = textoSobre(d.corPrimaria);
  return {
    formatVersion: 1,
    passTypeIdentifier: ids.passTypeId,
    teamIdentifier: ids.teamId,
    serialNumber: d.serial,
    authenticationToken: d.appleAuthToken,
    webServiceURL: URL_WEB_SERVICE,
    organizationName: d.estabelecimento,
    description: `Cartão fidelidade ${d.estabelecimento}`,
    logoText: d.estabelecimento,
    backgroundColor: rgb(d.corPrimaria),
    foregroundColor: rgb(texto),
    labelColor: rgb(texto),
    sharingProhibited: true,
    barcodes: [{ format: "PKBarcodeFormatQR", message: d.codigo, messageEncoding: "iso-8859-1", altText: d.codigo }],
    storeCard: {
      headerFields: [{ key: "carimbos", label: "CARIMBOS", value: progresso(d), changeMessage: "Seus carimbos: %@" }],
      primaryFields: [{ key: "recompensa_status", label: d.nome, value: statusRecompensa(d), changeMessage: "%@" }],
      secondaryFields: [
        { key: "cliente", label: "CLIENTE", value: d.nome },
        { key: "recompensa", label: "RECOMPENSA", value: d.recompensa },
      ],
      auxiliaryFields: [{ key: "codigo", label: "CÓDIGO", value: d.codigo }],
      backFields: [
        // Campo de mensagem: ao mudar, o iPhone mostra o texto na tela de bloqueio (se o cliente permitir)
        { key: "mensagem", label: "Última mensagem", value: d.mensagem ?? "Nenhuma mensagem ainda.", changeMessage: "%@" },
        { key: "regras", label: "Como funciona", value: regras(d) },
        { key: "cartao_web", label: "Cartão no navegador", value: d.urlCartao, dataDetectorTypes: ["PKDataDetectorTypeLink"] },
        { key: "privacidade", label: "Política de privacidade", value: d.urlPrivacidade, dataDetectorTypes: ["PKDataDetectorTypeLink"] },
        { key: "bicuira", label: "Tecnologia", value: "por Bicuíra Digital" },
      ],
    },
  };
}

/** Gera o arquivo .pkpass assinado. */
export async function gerarPkpass(d: DadosPass): Promise<Buffer> {
  const c = credenciais();
  const passJson = montarPassJson(d, c);
  const imagens = await imagensDoPass(d.corPrimaria, d.estabelecimento, d.logoUrl);
  const pass = new PKPass(
    { "pass.json": Buffer.from(JSON.stringify(passJson)), ...imagens },
    { wwdr: c.wwdr, signerCert: c.cert, signerKey: c.key, signerKeyPassphrase: c.passphrase },
  );
  return pass.getAsBuffer();
}

/**
 * Avisa os iPhones que têm o cartão: push vazio pelo APNs (HTTP/2) com o tópico = Pass Type ID.
 * O aparelho então busca a versão nova no web service. A entrega não é garantida.
 */
export async function avisarAparelhosApple(serial: string): Promise<{ enviados: number; modoTeste: boolean }> {
  const admin = supabaseAdmin();
  const { data: registros } = await admin
    .from("registros_apple")
    .select("device_library_id, dispositivos_apple (push_token)")
    .eq("serial", serial);
  const tokens = (registros ?? [])
    .map((r) => ({ device: r.device_library_id, token: (r.dispositivos_apple as unknown as { push_token: string } | null)?.push_token }))
    .filter((r): r is { device: string; token: string } => Boolean(r.token));

  if (!appleConfigurado()) {
    console.info(`[wallet:apple] modo de teste: atualização do pass ${serial} registrada (${tokens.length} aparelhos)`);
    return { enviados: 0, modoTeste: true };
  }
  if (tokens.length === 0) return { enviados: 0, modoTeste: false };

  const c = credenciais();
  const sessao = http2.connect("https://api.push.apple.com", { cert: c.cert, key: c.key, passphrase: c.passphrase });
  let enviados = 0;
  try {
    await Promise.all(
      tokens.map(
        ({ device, token }) =>
          new Promise<void>((resolve) => {
            const req = sessao.request({
              ":method": "POST",
              ":path": `/3/device/${token}`,
              "apns-topic": c.passTypeId,
              "content-type": "application/json",
            });
            req.setTimeout(10_000, () => req.close());
            req.on("response", async (h) => {
              const status = Number(h[":status"]);
              if (status === 200) enviados++;
              else if (status === 410 || status === 400) {
                // token inválido/expirado: o aparelho não tem mais o cartão
                await admin.from("registros_apple").delete().eq("device_library_id", device).eq("serial", serial);
              } else console.error(`[wallet:apple] APNs ${status} para ${device}`);
            });
            req.on("close", () => resolve());
            req.on("error", (e) => {
              console.error("[wallet:apple] APNs", e.message);
              resolve();
            });
            req.end("{}");
          }),
      ),
    );
  } finally {
    sessao.close();
  }
  return { enviados, modoTeste: false };
}
