import "server-only";
import { ImageResponse } from "next/og";
import { textoSobre } from "@/lib/tema";

/**
 * Imagens do pass geradas a partir da logo (ou da inicial do nome) sobre a cor do estabelecimento.
 * Apple exige icon.png; logo.png aparece no topo do cartão.
 */
async function png(lado: { w: number; h: number }, cor: string, nome: string, logoUrl: string | null, fundoTransparente = false) {
  const resposta = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: fundoTransparente ? "flex-start" : "center",
          background: fundoTransparente ? "transparent" : cor,
          color: textoSobre(cor),
          fontSize: Math.min(lado.w, lado.h) * 0.55,
          fontWeight: 700,
        }}
      >
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" height={lado.h * 0.9} style={{ objectFit: "contain", maxWidth: lado.w }} />
        ) : (
          nome.slice(0, 1).toUpperCase()
        )}
      </div>
    ),
    { width: lado.w, height: lado.h },
  );
  return Buffer.from(await resposta.arrayBuffer());
}

export async function imagensDoPass(cor: string, nome: string, logoUrl: string | null) {
  const [icon, icon2x, icon3x, logo, logo2x] = await Promise.all([
    png({ w: 29, h: 29 }, cor, nome, logoUrl),
    png({ w: 58, h: 58 }, cor, nome, logoUrl),
    png({ w: 87, h: 87 }, cor, nome, logoUrl),
    png({ w: 50, h: 50 }, cor, nome, logoUrl, true),
    png({ w: 100, h: 100 }, cor, nome, logoUrl, true),
  ]);
  return { "icon.png": icon, "icon@2x.png": icon2x, "icon@3x.png": icon3x, "logo.png": logo, "logo@2x.png": logo2x };
}
