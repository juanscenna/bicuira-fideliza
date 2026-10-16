// Tarefa agendada: envia campanhas cuja hora chegou e, em horário comercial, as automáticas diárias.
// Chamada a cada 5 min pelo pg_cron do Supabase (e uma vez por dia pelo Vercel Cron, como reserva).
// Protegida por CRON_SECRET (cabeçalho "Authorization: Bearer <segredo>").
import { timingSafeEqual } from "node:crypto";
import { processarCampanhasVencidas } from "@/lib/notificacoes/campanhas";
import { processarAutomaticasDiarias } from "@/lib/notificacoes/automaticas";
import { horarioComercial } from "@/lib/notificacoes/regras";

export const maxDuration = 60;

function autorizado(req: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo) return false;
  const a = Buffer.from(req.headers.get("authorization") ?? "");
  const b = Buffer.from(`Bearer ${segredo}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function executar(req: Request) {
  if (!autorizado(req)) return new Response("Não autorizado", { status: 401 });
  const campanhas = await processarCampanhasVencidas();
  const automaticas = horarioComercial() ? await processarAutomaticasDiarias() : { enviados: 0, foraDoHorario: true };
  return Response.json({ campanhas, automaticas });
}

export const GET = executar;
export const POST = executar;
