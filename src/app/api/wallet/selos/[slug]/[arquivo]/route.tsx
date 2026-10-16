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
  const porLinha = meta <= 5 ? meta : Math.ceil(meta / 2);
  const linhas = Math.ceil(meta / porLinha);
  const lado = Math.min(Math.floor((LARGURA - 80) / porLinha) - 20, Math.floor((ALTURA - 40) / linhas) - 20);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, background: tema.cor_primaria }}>
        {Array.from({ length: linhas }, (_, l) => (
          <div key={l} style={{ display: "flex", gap: 20 }}>
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
                    border: feito ? `5px solid ${tema.cor_secundaria}` : "4px dashed rgba(255,255,255,0.35)",
                    background: feito && !tema.selos ? tema.cor_secundaria : "transparent",
                    opacity: feito ? 1 : 0.55,
                  }}
                >
                  {tema.selos ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={(feito ? imgFeito : imgVazio)!} alt="" width={lado} height={lado} style={{ opacity: feito ? 1 : 0.5 }} />
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    ),
    { width: LARGURA, height: ALTURA, headers: { "Cache-Control": "public, max-age=31536000, immutable" } },
  );
}

async function embutir(caminho: string) {
  const r = await fetch(`${SITE_URL}${caminho}`);
  return `data:image/png;base64,${Buffer.from(await r.arrayBuffer()).toString("base64")}`;
}
