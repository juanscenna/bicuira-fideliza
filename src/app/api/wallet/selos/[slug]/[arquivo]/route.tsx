import { ImageResponse } from "next/og";
import { SITE_URL } from "@/lib/env";
import { TEMAS, temaDo } from "@/temas/config";

const LARGURA = 1032; // tamanho recomendado pelo Google para a imagem de destaque
const ALTURA = 336;

/** Faixa de selos do cartão no Google Wallet: "/api/wallet/selos/<slug>/<feitos>-<meta>.png". */
export async function GET(_req: Request, { params }: RouteContext<"/api/wallet/selos/[slug]/[arquivo]">) {
  const { slug, arquivo } = await params;
  const m = /^(\d{1,2})-(\d{1,2})\.png$/.exec(arquivo);
  if (!m) return new Response("Não encontrado", { status: 404 });
  const meta = Math.min(Math.max(Number(m[2]), 1), 20);
  const feitos = Math.min(Number(m[1]), meta);

  const tema = TEMAS[temaDo(slug)];
  // as imagens vão embutidas (data URI): o gerador não busca endereços do próprio servidor
  const [imgFeito, imgVazio] = tema.selos ? await Promise.all([embutir(tema.selos.feito), embutir(tema.selos.vazio)]) : [null, null];
  // mesma fonte pesada do cartão web (Montserrat 900, licença OFL)
  const fonte = await fetch(`${SITE_URL}/temas/rosa-norte/montserrat-900.woff`).then((r) => r.arrayBuffer());
  const porLinha = meta <= 5 ? meta : Math.ceil(meta / 2);
  const linhas = Math.ceil(meta / porLinha);
  const AREA = 640; // selos à esquerda, contador à direita (como no cartão web)
  const lado = Math.min(Math.floor((AREA - 40) / porLinha) - 14, Math.floor((ALTURA - 60) / linhas) - 14);
  const completo = feitos >= meta;
  const destaque = tema.selos ? "#F2B315" : "#FFFFFF";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          padding: "0 40px",
          fontFamily: "Montserrat",
          background: `radial-gradient(circle at 0% 0%, ${tema.selos ? "#3a0c1f" : "#2a2a2a"} 0%, ${tema.cor_primaria} 60%)`,
          borderTop: `6px solid ${tema.cor_secundaria}`,
        }}
      >
        <div style={{ width: AREA, display: "flex", flexDirection: "column", gap: 14 }}>
          {Array.from({ length: linhas }, (_, l) => (
            <div key={l} style={{ display: "flex", gap: 14 }}>
              {Array.from({ length: Math.min(porLinha, meta - l * porLinha) }, (_, c) => {
                const feito = l * porLinha + c < feitos;
                return (
                  <div
                    key={c}
                    style={{
                      width: lado,
                      height: lado,
                      borderRadius: lado,
                      display: "flex",
                      overflow: "hidden",
                      border: feito ? `5px solid ${tema.cor_secundaria}` : "4px dashed rgba(255,255,255,0.3)",
                      boxShadow: feito ? `0 0 18px ${tema.cor_secundaria}` : "none",
                      background: feito && !tema.selos ? tema.cor_secundaria : "transparent",
                    }}
                  >
                    {tema.selos ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={(feito ? imgFeito : imgVazio)!} alt="" width={lado} height={lado} style={{ opacity: feito ? 1 : 0.3 }} />
                    ) : null}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "flex-end", color: destaque, fontSize: 120, fontWeight: 900, lineHeight: 1 }}>
            {feitos}
            <span style={{ fontSize: 48, color: "rgba(255,255,255,0.6)", marginBottom: 12 }}>/{meta}</span>
          </div>
          <div
            style={{
              display: "flex",
              padding: "12px 22px",
              borderRadius: 18,
              background: destaque,
              color: "#0A0A0A",
              fontSize: 30,
              fontWeight: 700,
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            {completo ? "Ganhou!" : `Faltam ${meta - feitos} selos`}
          </div>
        </div>
      </div>
    ),
    { width: LARGURA, height: ALTURA, fonts: [{ name: "Montserrat", data: fonte, weight: 900, style: "normal" }], headers: { "Cache-Control": "public, max-age=31536000, immutable" } },
  );
}

async function embutir(caminho: string) {
  const r = await fetch(`${SITE_URL}${caminho}`);
  return `data:image/png;base64,${Buffer.from(await r.arrayBuffer()).toString("base64")}`;
}
