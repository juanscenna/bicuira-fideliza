// Conteúdo dos cartões de Wallet e geração do .pkpass (com certificado de teste, autoassinado).
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import JSZip from "jszip";
import type { DadosPass } from "@/lib/wallet/dados";

process.env.NEXT_PUBLIC_SUPABASE_URL ??= "http://127.0.0.1:54321";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??= "teste";
process.env.NEXT_PUBLIC_SITE_URL = "https://fideliza.bicuira.com.br";

const dados: DadosPass = {
  clienteId: "11111111-2222-4333-8444-555555555555",
  estabelecimentoId: "e0000000-0000-4000-8000-000000000001",
  slug: "restaurante-teste",
  estabelecimento: "Restaurante Teste",
  logoUrl: null,
  corPrimaria: "#25433D",
  corSecundaria: "#F2EBDD",
  nome: "Ana Souza",
  codigo: "K4827",
  plano: "morador",
  carimbos: 7,
  meta: 10,
  recompensa: "1 prato",
  gastoMinimoCentavos: 1500,
  serial: "abc123",
  appleAuthToken: "t".repeat(48),
  googleObjectId: null,
  versao: 3,
  atualizadoEm: new Date().toISOString(),
  mensagem: "Hoje tem sobremesa nova!",
  urlCartao: "https://fideliza.bicuira.com.br/restaurante-teste/cartao/x",
  urlPrivacidade: "https://fideliza.bicuira.com.br/restaurante-teste/privacidade",
};

describe("Apple Wallet", () => {
  it("pass.json do tipo storeCard com carimbos, QR, mensagem e verso", async () => {
    const { montarPassJson } = await import("@/lib/wallet/apple");
    const p = montarPassJson(dados, { passTypeId: "pass.br.com.bicuira.fideliza", teamId: "ABCDE12345" });
    expect(p.webServiceURL).toBe("https://fideliza.bicuira.com.br/api/wallet/apple");
    expect(p.organizationName).toBe("Restaurante Teste");
    expect(p.backgroundColor).toBe("rgb(37, 67, 61)");
    expect(p.barcodes[0]).toMatchObject({ format: "PKBarcodeFormatQR", message: "K4827", altText: "K4827" });
    expect(p.storeCard.headerFields[0]).toMatchObject({ value: "7/10", changeMessage: "Seus selos: %@" });
    expect(p.storeCard.primaryFields[0].value).toBe("Faltam 3 para 1 prato");
    const verso = Object.fromEntries(p.storeCard.backFields.map((f) => [f.key, f]));
    expect(verso.mensagem).toMatchObject({ value: "Hoje tem sobremesa nova!", changeMessage: "%@" });
    expect(verso.privacidade.value).toBe(dados.urlPrivacidade);
    expect(verso.bicuira.value).toBe("por Bicuíra Digital");
  });

  it("cartão cheio mostra a recompensa disponível", async () => {
    const { montarPassJson } = await import("@/lib/wallet/apple");
    const p = montarPassJson({ ...dados, carimbos: 10 }, { passTypeId: "p", teamId: "t" });
    expect(p.storeCard.primaryFields[0].value).toBe("Disponível: 1 prato");
  });

  describe("arquivo .pkpass", () => {
    beforeAll(() => {
      // certificados de mentira, só para provar que o arquivo é montado e assinado
      const dir = mkdtempSync(join(tmpdir(), "pass-"));
      const gerar = (nome: string) =>
        execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1", "-subj", `/CN=${nome}`,
          "-keyout", join(dir, `${nome}.key`), "-out", join(dir, `${nome}.pem`)], { stdio: "ignore" });
      gerar("signer");
      gerar("wwdr");
      process.env.APPLE_PASS_TYPE_ID = "pass.br.com.bicuira.teste";
      process.env.APPLE_TEAM_ID = "ABCDE12345";
      process.env.APPLE_PASS_CERT_BASE64 = readFileSync(join(dir, "signer.pem")).toString("base64");
      process.env.APPLE_PASS_KEY_BASE64 = readFileSync(join(dir, "signer.key")).toString("base64");
      process.env.APPLE_WWDR_CERT_BASE64 = readFileSync(join(dir, "wwdr.pem")).toString("base64");
    });

    it("contém pass.json, ícones, manifest e assinatura", async () => {
      const { gerarPkpass } = await import("@/lib/wallet/apple");
      const zip = await JSZip.loadAsync(await gerarPkpass(dados));
      const arquivos = Object.keys(zip.files).sort();
      expect(arquivos).toEqual(expect.arrayContaining(["icon.png", "icon@2x.png", "logo.png", "manifest.json", "pass.json", "signature"]));
      const pass = JSON.parse(await zip.file("pass.json")!.async("string"));
      expect(pass.passTypeIdentifier).toBe("pass.br.com.bicuira.teste");
      expect(pass.serialNumber).toBe("abc123");
      expect(pass.authenticationToken).toBe(dados.appleAuthToken);
    }, 30_000);
  });
});

describe("Google Wallet", () => {
  it("classe por estabelecimento e objeto por cliente", async () => {
    const { montarClasse, montarObjeto } = await import("@/lib/wallet/google");
    const c = montarClasse(dados, "3388000000012345678");
    const o = montarObjeto(dados, "3388000000012345678");
    expect(c.id).toBe("3388000000012345678.estab_e0000000000040008000000000000001");
    expect(c.hexBackgroundColor).toBe("#25433D");
    expect(c.programLogo.sourceUri.uri).toBe("https://fideliza.bicuira.com.br/restaurante-teste/icone/512");
    expect(o.classId).toBe(c.id);
    expect(o.id).toBe("3388000000012345678.cliente_11111111222243338444555555555555");
    expect(o.loyaltyPoints.balance.string).toBe("7/10");
    expect(o.barcode).toEqual({ type: "QR_CODE", value: "K4827", alternateText: "K4827" });
    expect(o.accountName).toBe("Ana Souza");
    expect(o.secondaryLoyaltyPoints).toBeDefined(); // tema básico: sem faixa de selos
    expect(o.heroImage.sourceUri.uri).toMatch(/\/api\/wallet\/selos\/restaurante-teste\/7-10\.png$/);
  });

  it("tema com faixa de selos: título, Instagram e sem linha de recompensa", async () => {
    const { montarClasse, montarObjeto } = await import("@/lib/wallet/google");
    const rosa = { ...dados, slug: "comidacaseirarosanorte" };
    expect(montarClasse(rosa, "1").programName).toBe("Junte selos. Ganhe recompensas.");
    const o = montarObjeto(rosa, "1");
    expect(o.secondaryLoyaltyPoints).toBeUndefined();
    expect(o.linksModuleData.uris.map((u) => u.id)).toContain("instagram");
  });
});
