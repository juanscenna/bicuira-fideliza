import { clientePorToken } from "@/lib/cartao";
import { dadosDoCliente } from "@/lib/lgpd";
import { estabelecimentoPorSlug } from "@/lib/publico";
import { registrarAuditoria } from "@/lib/auditoria";

/** "Baixar meus dados" (LGPD art. 18, II): arquivo JSON com os dados do próprio cliente. ?e=slug */
export async function GET(req: Request, { params }: RouteContext<"/api/cartao/[token]/meus-dados">) {
  const { token } = await params;
  const slug = new URL(req.url).searchParams.get("e") ?? "";
  const estab = await estabelecimentoPorSlug(slug);
  const clienteId = estab ? await clientePorToken(estab.id, token) : null;
  const dados = clienteId ? await dadosDoCliente(clienteId) : null;
  if (!estab || !clienteId || !dados) return new Response("Cartão não encontrado.", { status: 404, headers: { "Cache-Control": "no-store" } });

  await registrarAuditoria({ acao: "cliente.exportar_dados", userId: null, estabelecimentoId: estab.id, alvoTipo: "cliente", alvoId: clienteId });
  const corpo = JSON.stringify({ estabelecimento: estab.nome, gerado_em: new Date().toISOString(), ...dados }, null, 2);
  return new Response(corpo, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="meus-dados-${slug}.json"`,
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
