import { estabelecimentoParaQr } from "../dados";
import { qrPng } from "@/lib/qr";
import { SITE_URL } from "@/lib/env";

export async function GET(_req: Request, { params }: RouteContext<"/admin/[id]/qr/png">) {
  const { id } = await params;
  const estab = await estabelecimentoParaQr(id);
  if (!estab) return new Response("Não encontrado", { status: 404 });

  const png = await qrPng(`${SITE_URL}/${estab.slug}`);
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="qrcode-${estab.slug}.png"`,
      "Cache-Control": "no-store",
    },
  });
}
