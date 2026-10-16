import { ImageResponse } from "next/og";
import { estabelecimentoPorSlug } from "@/lib/publico";
import { textoSobre } from "@/lib/tema";

const TAMANHOS = new Set([180, 192, 512]);

/** Ícone da tela inicial: logo sobre a cor do estabelecimento (ou a inicial do nome). */
export async function GET(_req: Request, { params }: RouteContext<"/[slug]/icone/[tamanho]">) {
  const { slug, tamanho } = await params;
  const lado = Number(tamanho);
  const estab = await estabelecimentoPorSlug(slug);
  if (!estab || !TAMANHOS.has(lado)) return new Response("Não encontrado", { status: 404 });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: estab.cor_primaria,
          color: textoSobre(estab.cor_primaria),
          fontSize: lado * 0.5,
          fontWeight: 700,
        }}
      >
        {estab.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={estab.logoUrl} alt="" width={lado * 0.7} height={lado * 0.7} style={{ objectFit: "contain", borderRadius: lado * 0.12, background: "#fff" }} />
        ) : (
          estab.nome.slice(0, 1).toUpperCase()
        )}
      </div>
    ),
    { width: lado, height: lado, headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
