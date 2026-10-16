import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { exigirDono } from "@/lib/auth";
import { supabaseServidor } from "@/lib/supabase/servidor";
import { formatarTelefone } from "@/lib/dominio/telefone";
import { FichaCliente, type ItemHistorico } from "@/components/painel/FichaCliente";

export default async function Ficha({ params, searchParams }: PageProps<"/painel/clientes/[id]">) {
  const { estabelecimento } = await exigirDono();
  const { id } = await params;
  const { registrar } = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const supabase = await supabaseServidor();

  const [{ data: cliente }, { data: estab }, { data: planos }, { data: visitas }, { data: eventos }] = await Promise.all([
    supabase.from("clientes_resumo").select("*").eq("id", id).maybeSingle(),
    supabase.from("estabelecimentos").select("gasto_minimo_centavos").eq("id", estabelecimento.id).single(),
    supabase.from("planos").select("tipo, carimbos_meta, recompensa_texto").eq("ativo", true),
    supabase
      .from("visitas")
      .select("id, valor_centavos, descricao, gerou_carimbo, criado_em, editado_em, desfeita_em, ciclo")
      .eq("cliente_id", id)
      .order("criado_em", { ascending: false })
      .limit(100),
    supabase
      .from("eventos_carimbo")
      .select("id, tipo, delta, saldo_apos, motivo, dados, criado_em, visita_id, evento_desfeito_id")
      .eq("cliente_id", id)
      .neq("tipo", "visita")
      .order("criado_em", { ascending: false })
      .limit(100),
  ]);
  if (!cliente) notFound();

  const historico: ItemHistorico[] = [
    ...(visitas ?? []).map((v) => ({ tipo: "visita" as const, ...v })),
    ...(eventos ?? []).map((e) => ({ ...e, tipo_evento: e.tipo, tipo: "evento" as const })),
  ].sort((a, b) => b.criado_em.localeCompare(a.criado_em));

  return (
    <div className="flex flex-col gap-4">
      <Link href="/painel" className="flex min-h-11 items-center gap-1 self-start font-semibold text-restinga">
        <ChevronLeft aria-hidden className="size-5" /> Início
      </Link>
      <FichaCliente
        cliente={{
          id: cliente.id,
          nome: cliente.nome,
          telefone: formatarTelefone(cliente.telefone),
          codigo: cliente.codigo,
          plano: cliente.plano_tipo,
          carimbos: cliente.carimbos_atuais,
          meta: cliente.meta,
          recompensa: cliente.recompensa,
          recompensaDisponivel: cliente.recompensa_disponivel,
          totalVisitas: cliente.total_visitas,
          totalGasto: Number(cliente.total_gasto_centavos),
        }}
        gastoMinimo={estab?.gasto_minimo_centavos ?? 0}
        planos={planos ?? []}
        historico={historico}
        focarValor={registrar === "1"}
      />
    </div>
  );
}
