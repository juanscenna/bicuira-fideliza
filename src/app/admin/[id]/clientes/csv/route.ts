import { exigirSuperAdmin } from "@/lib/auth";
import { carregarEstabelecimento } from "@/lib/admin/dados";
import { clientesDoEstabelecimento } from "@/lib/admin/clientes";
import { formatarTelefone } from "@/lib/dominio/telefone";
import { formatarDia } from "@/lib/dominio/datas";

const celula = (v: string | number) => {
  const t = String(v);
  // evita fórmulas ao abrir no Excel/Sheets
  const seguro = /^[=+\-@]/.test(t) ? `'${t}` : t;
  return /[;"\n]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
};
const reais = (centavos: number) => (centavos / 100).toFixed(2).replace(".", ",");

/** Planilha (CSV com ponto e vírgula, abre direto no Excel em português) com os clientes do estabelecimento. */
export async function GET(_req: Request, { params }: RouteContext<"/admin/[id]/clientes/csv">) {
  await exigirSuperAdmin();
  const { id } = await params;
  const estab = await carregarEstabelecimento(id);
  if (!estab) return new Response("Não encontrado", { status: 404 });
  const clientes = await clientesDoEstabelecimento(id);

  const linhas = [
    ["Nome", "Telefone", "Código", "Plano", "Visitas", "Gasto total (R$)", "Ticket médio (R$)", "Selos atuais", "Resgates", "Cadastro", "Última visita"],
    ...clientes
      .sort((a, b) => b.gastoCentavos - a.gastoCentavos)
      .map((c) => [
        c.nome,
        c.telefone ? formatarTelefone(c.telefone) : "",
        c.codigo,
        c.plano === "morador" ? "Morador" : "Turista",
        c.visitas,
        reais(c.gastoCentavos),
        c.visitas ? reais(Math.round(c.gastoCentavos / c.visitas)) : "",
        c.carimbos,
        c.resgates,
        formatarDia(c.cadastroEm),
        c.ultimaVisitaEm ? formatarDia(c.ultimaVisitaEm) : "",
      ]),
  ];
  const csv = "﻿" + linhas.map((l) => l.map(celula).join(";")).join("\r\n");
  const nome = `clientes-${estab.slug}-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nome}"`,
      "Cache-Control": "no-store",
    },
  });
}
