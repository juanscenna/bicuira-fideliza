// Web service da Apple: registrar / cancelar o registro de um aparelho para receber atualizações do pass.
import { supabaseAdmin } from "@/lib/supabase/admin";
import { autorizarPass } from "@/lib/wallet/web-service";

type Ctx = RouteContext<"/api/wallet/apple/v1/devices/[device]/registrations/[passType]/[serial]">;

export async function POST(req: Request, { params }: Ctx) {
  const { device, passType, serial } = await params;
  if (!(await autorizarPass(req, passType, serial))) return new Response(null, { status: 401 });
  const corpo = (await req.json().catch(() => ({}))) as { pushToken?: string };
  if (!corpo.pushToken) return new Response(null, { status: 400 });

  const admin = supabaseAdmin();
  await admin.from("dispositivos_apple").upsert({ device_library_id: device, push_token: corpo.pushToken });
  const { data: existente } = await admin
    .from("registros_apple")
    .select("serial")
    .eq("device_library_id", device)
    .eq("serial", serial)
    .maybeSingle();
  if (existente) return new Response(null, { status: 200 });
  await admin.from("registros_apple").insert({ device_library_id: device, serial });
  return new Response(null, { status: 201 });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const { device, passType, serial } = await params;
  if (!(await autorizarPass(req, passType, serial))) return new Response(null, { status: 401 });
  const admin = supabaseAdmin();
  await admin.from("registros_apple").delete().eq("device_library_id", device).eq("serial", serial);
  const { count } = await admin.from("registros_apple").select("serial", { count: "exact", head: true }).eq("device_library_id", device);
  if (!count) await admin.from("dispositivos_apple").delete().eq("device_library_id", device);
  return new Response(null, { status: 200 });
}
