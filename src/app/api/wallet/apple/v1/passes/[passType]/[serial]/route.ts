// Web service da Apple: entrega a versão mais recente do pass.
import { autorizarPass } from "@/lib/wallet/web-service";
import { dadosPorSerial } from "@/lib/wallet/dados";
import { gerarPkpass } from "@/lib/wallet/apple";
import { appleConfigurado } from "@/lib/wallet/config";

export async function GET(req: Request, { params }: RouteContext<"/api/wallet/apple/v1/passes/[passType]/[serial]">) {
  const { passType, serial } = await params;
  if (!appleConfigurado()) return new Response(null, { status: 404 });
  if (!(await autorizarPass(req, passType, serial))) return new Response(null, { status: 401 });
  const d = await dadosPorSerial(serial);
  if (!d) return new Response(null, { status: 404 });

  const modificado = new Date(d.atualizadoEm);
  const desde = req.headers.get("if-modified-since");
  if (desde && Math.floor(modificado.getTime() / 1000) <= Math.floor(new Date(desde).getTime() / 1000)) {
    return new Response(null, { status: 304 });
  }
  return new Response(new Uint8Array(await gerarPkpass(d)), {
    headers: { "Content-Type": "application/vnd.apple.pkpass", "Last-Modified": modificado.toUTCString(), "Cache-Control": "no-store" },
  });
}
