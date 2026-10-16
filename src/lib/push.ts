import "server-only";
import webpush from "web-push";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** Web push pronto quando as chaves VAPID estão nas variáveis de ambiente. */
export function pushConfigurado() {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

let configurado = false;
function configurar() {
  if (configurado) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:contato@bicuira.com.br",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  configurado = true;
}

export type AvisoPush = { titulo: string; corpo: string; url: string; icone: string; badge?: string };

/** Clientes (dentre os informados) que aceitaram notificações. */
export async function clientesComPush(clienteIds: string[]) {
  if (!pushConfigurado() || clienteIds.length === 0) return new Set<string>();
  const { data } = await supabaseAdmin().from("push_inscricoes").select("cliente_id").in("cliente_id", clienteIds);
  return new Set((data ?? []).map((d) => d.cliente_id as string));
}

/**
 * Manda a notificação para todos os aparelhos do cliente.
 * Inscrições que o navegador já cancelou (404/410) são apagadas.
 */
export async function enviarPush(clienteId: string, aviso: AvisoPush) {
  if (!pushConfigurado()) return;
  configurar();
  const admin = supabaseAdmin();
  const { data: inscricoes } = await admin.from("push_inscricoes").select("id, endpoint, p256dh, auth").eq("cliente_id", clienteId);
  await Promise.all(
    (inscricoes ?? []).map(async (i) => {
      try {
        await webpush.sendNotification({ endpoint: i.endpoint, keys: { p256dh: i.p256dh, auth: i.auth } }, JSON.stringify(aviso), { TTL: 60 * 60 * 24 });
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) await admin.from("push_inscricoes").delete().eq("id", i.id);
        else console.error("[push]", status, (e as Error).message);
      }
    }),
  );
}
