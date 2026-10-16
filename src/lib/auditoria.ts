import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Registro = {
  acao: string;                   // ex.: "login", "visita.registrar"
  userId: string | null;
  estabelecimentoId?: string | null;
  alvoTipo?: string;
  alvoId?: string;
  antes?: unknown;
  depois?: unknown;
};

/** IP com hash: dá para comparar acessos sem guardar o endereço. */
export function hashIp(ip: string | null) {
  if (!ip) return null;
  const sal = process.env.SEGREDO_HASH ?? "desenvolvimento-local";
  return createHash("sha256").update(`${sal}:${ip}`).digest("hex").slice(0, 32);
}

/** Quem/onde: navegador e IP (com hash) da requisição atual. */
export async function origemDaRequisicao() {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip");
  return { userAgent: h.get("user-agent")?.slice(0, 300) ?? null, ipHash: hashIp(ip ?? null) };
}

/** Grava na auditoria (só inserção). Nunca derruba a ação principal se falhar. */
export async function registrarAuditoria(r: Registro) {
  try {
    const origem = await origemDaRequisicao();
    const { error } = await supabaseAdmin().from("auditoria").insert({
      acao: r.acao,
      user_id: r.userId,
      estabelecimento_id: r.estabelecimentoId ?? null,
      alvo_tipo: r.alvoTipo ?? null,
      alvo_id: r.alvoId ?? null,
      antes: r.antes ?? null,
      depois: r.depois ?? null,
      user_agent: origem.userAgent,
      ip_hash: origem.ipHash,
    });
    if (error) console.error("[auditoria]", error.message);
  } catch (erro) {
    console.error("[auditoria]", erro);
  }
}
