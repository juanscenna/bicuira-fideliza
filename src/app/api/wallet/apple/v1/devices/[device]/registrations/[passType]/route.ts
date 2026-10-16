// Web service da Apple: quais passes deste aparelho mudaram desde a última consulta.
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: Request, { params }: RouteContext<"/api/wallet/apple/v1/devices/[device]/registrations/[passType]">) {
  const { device, passType } = await params;
  if (passType !== process.env.APPLE_PASS_TYPE_ID) return new Response(null, { status: 404 });
  const desde = Number(new URL(req.url).searchParams.get("passesUpdatedSince") ?? "0");

  const { data } = await supabaseAdmin()
    .from("registros_apple")
    .select("serial, passes (atualizado_em)")
    .eq("device_library_id", device);
  const passes = (data ?? []).map((r) => ({
    serial: r.serial,
    atualizado: new Date((r.passes as unknown as { atualizado_em: string }).atualizado_em).getTime(),
  }));
  const mudaram = passes.filter((p) => !desde || p.atualizado > desde);
  if (mudaram.length === 0) return new Response(null, { status: 204 });

  // a "etiqueta" de atualização é o instante (ms) da mudança mais recente
  const lastUpdated = String(Math.max(...mudaram.map((p) => p.atualizado)));
  return Response.json({ serialNumbers: mudaram.map((p) => p.serial), lastUpdated });
}
