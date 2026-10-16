import "server-only";
import { timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** Confere o cabeçalho "Authorization: ApplePass <token>" contra o token do pass. */
export async function autorizarPass(req: Request, passType: string, serial: string) {
  if (passType !== process.env.APPLE_PASS_TYPE_ID) return false;
  const recebido = (req.headers.get("authorization") ?? "").replace(/^ApplePass\s+/i, "");
  const { data } = await supabaseAdmin().from("passes").select("apple_auth_token").eq("serial", serial).maybeSingle();
  if (!data || !recebido) return false;
  const a = Buffer.from(recebido);
  const b = Buffer.from(data.apple_auth_token);
  return a.length === b.length && timingSafeEqual(a, b);
}
