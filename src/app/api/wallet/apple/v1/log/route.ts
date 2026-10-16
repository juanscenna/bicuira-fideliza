// Web service da Apple: o iPhone envia aqui mensagens de erro sobre os passes (ficam no log do servidor).
export async function POST(req: Request) {
  const corpo = (await req.json().catch(() => ({}))) as { logs?: string[] };
  for (const linha of (corpo.logs ?? []).slice(0, 20)) console.warn("[wallet:apple:log]", String(linha).slice(0, 500));
  return new Response(null, { status: 200 });
}
