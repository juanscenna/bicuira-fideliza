import "server-only";
import { obterSessao } from "@/lib/auth";
import { supabaseServidor } from "@/lib/supabase/servidor";

/** Confere o super admin e devolve nome/slug do estabelecimento (ou null). */
export async function estabelecimentoParaQr(id: string) {
  const sessao = await obterSessao();
  if (sessao?.papel !== "super_admin") return null;
  const supabase = await supabaseServidor();
  const { data } = await supabase.from("estabelecimentos").select("nome, slug").eq("id", id).maybeSingle();
  return data;
}
