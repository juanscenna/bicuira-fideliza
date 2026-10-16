import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/env";

/**
 * Cliente com a CHAVE SECRETA: ignora o RLS. Use só no servidor e sempre
 * conferindo antes, no código, qual estabelecimento está sendo acessado.
 */
export function supabaseAdmin() {
  const chave = process.env.SUPABASE_SECRET_KEY;
  if (!chave) throw new Error("Falta SUPABASE_SECRET_KEY (veja o .env.example).");
  return createClient(SUPABASE_URL, chave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
