import { estabelecimentoPorSlug } from "@/lib/publico";

/** Manifest para "Adicionar à tela inicial": abre direto no cartão, com nome e ícone do estabelecimento. */
export async function GET(_req: Request, { params }: RouteContext<"/[slug]/cartao/[token]/manifest.webmanifest">) {
  const { slug, token } = await params;
  const estab = await estabelecimentoPorSlug(slug);
  if (!estab || !/^[0-9a-f]{48}$/.test(token)) return new Response("Não encontrado", { status: 404 });

  const inicio = `/${slug}/cartao/${token}`;
  return Response.json(
    {
      name: `Cartão ${estab.nome}`,
      short_name: estab.nome.slice(0, 12),
      start_url: inicio,
      scope: inicio,
      display: "standalone",
      background_color: "#fafafa",
      theme_color: estab.cor_primaria,
      icons: [
        { src: `/${slug}/icone/192`, sizes: "192x192", type: "image/png" },
        { src: `/${slug}/icone/512`, sizes: "512x512", type: "image/png" },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json", "Cache-Control": "no-store" } },
  );
}
