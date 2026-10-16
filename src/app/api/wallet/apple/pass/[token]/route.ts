// Botão "Adicionar ao Apple Wallet": baixa o .pkpass do cliente. ?e=slug
import { dadosPorToken } from "@/lib/wallet/dados";
import { gerarPkpass } from "@/lib/wallet/apple";
import { appleConfigurado } from "@/lib/wallet/config";

export async function GET(req: Request, { params }: RouteContext<"/api/wallet/apple/pass/[token]">) {
  const { token } = await params;
  if (!appleConfigurado()) return new Response("Wallet ainda não configurado", { status: 503 });
  const d = await dadosPorToken(token, new URL(req.url).searchParams.get("e") ?? "");
  if (!d) return new Response("Cartão não encontrado", { status: 404 });
  return new Response(new Uint8Array(await gerarPkpass(d)), {
    headers: {
      "Content-Type": "application/vnd.apple.pkpass",
      "Content-Disposition": `attachment; filename="cartao-${d.slug}.pkpass"`,
      "Cache-Control": "no-store",
    },
  });
}
