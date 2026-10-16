import { carregarCartao } from "@/lib/cartao";
import { estabelecimentoPorSlug } from "@/lib/publico";

/** Estado atual do cartão web (consultado quando chega o aviso de tempo real). ?e=slug */
export async function GET(req: Request, { params }: RouteContext<"/api/cartao/[token]">) {
  const { token } = await params;
  const slug = new URL(req.url).searchParams.get("e") ?? "";
  const estab = await estabelecimentoPorSlug(slug);
  const cartao = estab ? await carregarCartao(estab.id, token) : null;
  if (!cartao) return Response.json({ erro: "não encontrado" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  return Response.json(cartao, { headers: { "Cache-Control": "no-store" } });
}
