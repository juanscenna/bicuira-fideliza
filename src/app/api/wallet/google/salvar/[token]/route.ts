// Botão "Adicionar ao Google Wallet": cria/atualiza a classe do estabelecimento e redireciona
// para o link oficial de salvar (JWT assinado pela conta de serviço). ?e=slug
import { dadosPorToken } from "@/lib/wallet/dados";
import { linkSalvarGoogle } from "@/lib/wallet/google";
import { googleConfigurado } from "@/lib/wallet/config";

export async function GET(req: Request, { params }: RouteContext<"/api/wallet/google/salvar/[token]">) {
  const { token } = await params;
  if (!googleConfigurado()) return new Response("Wallet ainda não configurado", { status: 503 });
  const d = await dadosPorToken(token, new URL(req.url).searchParams.get("e") ?? "");
  if (!d) return new Response("Cartão não encontrado", { status: 404 });
  try {
    return Response.redirect(await linkSalvarGoogle(d), 302);
  } catch (erro) {
    console.error("[wallet:google]", erro);
    return new Response("Não foi possível abrir o Google Wallet agora. Tente de novo em instantes.", { status: 502 });
  }
}
