import { ImageResponse } from "next/og";
import { SITE_URL } from "@/lib/env";
import { TEMAS, temaDo } from "@/temas/config";

const LADO = 660; // tamanho recomendado pelo Google para a logo do cartão (exibida recortada em círculo)

/**
 * Logo do estabelecimento para o Google Wallet: "/api/wallet/logo/<slug>.png".
 * Quadrada, com a logo inteira centralizada sobre a cor do cartão, para o recorte em círculo do Google
 * não cortar nem esticar a logo (uma logo larga enviada direto fica espremida e cortada nas pontas).
 */
export async function GET(_req: Request, { params }: RouteContext<"/api/wallet/logo/[slug]">) {
  const slug = (await params).slug.replace(/\.png$/, "");
  const tema = TEMAS[temaDo(slug)];
  if (!tema.logoUrl) return Response.redirect(`${SITE_URL}/${slug}/icone/512`, 302);

  const r = await fetch(tema.logoUrl);
  if (!r.ok) return new Response("Logo indisponível", { status: 502 });
  const dados = Buffer.from(await r.arrayBuffer());
  const { largura, altura } = tamanhoPng(dados);
  const escala = tema.logoWallet?.escala ?? 0.72;
  // cabe num quadrado de LADO × escala, mantendo a proporção
  const max = LADO * escala;
  const fator = Math.min(max / largura, max / altura);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: tema.logoWallet?.fundo ?? tema.cor_primaria }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`data:image/png;base64,${dados.toString("base64")}`} alt="" width={Math.round(largura * fator)} height={Math.round(altura * fator)} />
      </div>
    ),
    { width: LADO, height: LADO, headers: { "Cache-Control": "public, max-age=31536000, immutable" } },
  );
}

/** Largura e altura de um PNG (cabeçalho IHDR). */
function tamanhoPng(b: Buffer) {
  if (b.length < 24 || b.readUInt32BE(12) !== 0x49484452) return { largura: LADO, altura: LADO };
  return { largura: b.readUInt32BE(16), altura: b.readUInt32BE(20) };
}
