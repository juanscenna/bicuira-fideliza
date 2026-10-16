import "server-only";
import { SUPABASE_URL } from "@/lib/env";
import { canalDoCartao, EVENTO_ATUALIZOU } from "@/lib/tempo-real";

/** Avisa o(s) cartão(ões) web abertos que algo mudou. Falha em silêncio (o cartão também consulta sozinho). */
export async function avisarCartoes(tokens: string[]) {
  if (tokens.length === 0) return;
  try {
    const messages = await Promise.all(
      tokens.map(async (t) => ({ topic: await canalDoCartao(t), event: EVENTO_ATUALIZOU, payload: {}, private: false })),
    );
    const r = await fetch(`${SUPABASE_URL}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: process.env.SUPABASE_SECRET_KEY!,
        Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY}`,
      },
      body: JSON.stringify({ messages }),
    });
    if (!r.ok) console.error("[tempo real]", r.status, await r.text());
  } catch (erro) {
    console.error("[tempo real]", erro);
  }
}
