import { after } from "next/server";
import { estabelecimentoPorSlug } from "@/lib/publico";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { enviarPush, pushConfigurado } from "@/lib/push";
import { SITE_URL } from "@/lib/env";
import { iconesDo } from "@/temas/config";

type Inscricao = { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };

async function cartao(req: Request, token: string) {
  const slug = new URL(req.url).searchParams.get("e") ?? "";
  if (!/^[0-9a-f]{48}$/.test(token)) return null;
  const estab = await estabelecimentoPorSlug(slug);
  if (!estab) return null;
  const { data } = await supabaseAdmin()
    .from("clientes")
    .select("id")
    .eq("estabelecimento_id", estab.id)
    .eq("token_cartao", token)
    .is("anonimizado_em", null)
    .maybeSingle();
  return data ? { clienteId: data.id as string, nome: estab.nome, slug } : null;
}

/**
 * O cartão aceitou notificações: guarda a inscrição do navegador.
 * Aparelho novo (ou ?teste=1) recebe na hora uma notificação de boas-vindas, que confirma que funciona.
 */
export async function POST(req: Request, { params }: RouteContext<"/api/push/[token]">) {
  if (!pushConfigurado()) return new Response("Indisponível", { status: 503 });
  const { token } = await params;
  const c = await cartao(req, token);
  if (!c) return new Response("Não encontrado", { status: 404 });

  const i = (await req.json().catch(() => null)) as Inscricao | null;
  const endpoint = typeof i?.endpoint === "string" ? i.endpoint : "";
  const p256dh = typeof i?.keys?.p256dh === "string" ? i.keys.p256dh : "";
  const auth = typeof i?.keys?.auth === "string" ? i.keys.auth : "";
  if (!/^https:\/\//.test(endpoint) || endpoint.length > 1000 || !p256dh || !auth || p256dh.length > 200 || auth.length > 100) {
    return new Response("Inscrição inválida", { status: 400 });
  }
  const admin = supabaseAdmin();
  const { data: existente } = await admin.from("push_inscricoes").select("id").eq("endpoint", endpoint).maybeSingle();
  const { error } = await admin.from("push_inscricoes").upsert({ cliente_id: c.clienteId, endpoint, p256dh, auth }, { onConflict: "endpoint" });
  if (error) return new Response("Erro", { status: 500 });

  if (!existente || new URL(req.url).searchParams.get("teste") === "1") {
    after(() =>
      enviarPush(c.clienteId, {
        titulo: c.nome,
        corpo: "Pronto! Você vai receber os avisos do restaurante aqui. 🎉",
        url: `${SITE_URL}/${c.slug}/cartao/${token}`,
        icone: `${SITE_URL}${iconesDo(c.slug).icon[0].url}`,
      }),
    );
  }
  return new Response(null, { status: 204 });
}

/** O cliente desligou as notificações neste aparelho. */
export async function DELETE(req: Request, { params }: RouteContext<"/api/push/[token]">) {
  const { token } = await params;
  const c = await cartao(req, token);
  if (!c) return new Response("Não encontrado", { status: 404 });
  const { endpoint } = ((await req.json().catch(() => ({}))) ?? {}) as { endpoint?: string };
  if (endpoint) await supabaseAdmin().from("push_inscricoes").delete().eq("cliente_id", c.clienteId).eq("endpoint", endpoint);
  return new Response(null, { status: 204 });
}
