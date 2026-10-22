import Link from "next/link";
import { Gift } from "lucide-react";
import { exigirDono } from "@/lib/auth";
import { termosDo, traduzir } from "@/temas/vocabulario";
import { supabaseServidor } from "@/lib/supabase/servidor";
import { formatarReais } from "@/lib/dominio/dinheiro";
import { inicioDoDia } from "@/lib/dominio/datas";
import { BuscaCodigo } from "@/components/painel/BuscaCodigo";

export default async function PainelInicio() {
  const { estabelecimento } = await exigirDono();
  const t = (texto: string) => traduzir(texto, termosDo(estabelecimento.slug));
  const supabase = await supabaseServidor();
  const hoje = inicioDoDia();

  // O RLS limita tudo ao estabelecimento do login.
  const [visitas, carimbos, resgates, novos, disponiveis] = await Promise.all([
    supabase.from("visitas").select("valor_centavos").gte("criado_em", hoje).is("desfeita_em", null),
    supabase.from("eventos_carimbo").select("delta").gte("criado_em", hoje).in("tipo", ["visita", "manual_mais", "manual_menos", "desfazer", "ajuste_edicao"]),
    supabase.from("eventos_carimbo").select("id", { count: "exact", head: true }).gte("criado_em", hoje).eq("tipo", "resgate"),
    supabase.from("clientes").select("id", { count: "exact", head: true }).gte("criado_em", hoje),
    supabase.from("clientes_resumo").select("id", { count: "exact", head: true }).eq("recompensa_disponivel", true),
  ]);

  const totalVisitas = visitas.data?.length ?? 0;
  const gasto = (visitas.data ?? []).reduce((s, v) => s + v.valor_centavos, 0);
  const carimbosHoje = (carimbos.data ?? []).reduce((s, e) => s + e.delta, 0);
  const comRecompensa = disponiveis.count ?? 0;

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <h1 className="font-display text-4xl text-restinga">{t("Registrar visita")}</h1>
        <BuscaCodigo />
      </section>

      <section aria-labelledby="titulo-hoje" className="flex flex-col gap-3">
        <h2 id="titulo-hoje" className="font-display text-2xl text-restinga">
          Hoje
        </h2>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Numero rotulo={t("Visitas")} valor={String(totalVisitas)} />
          <Numero rotulo="Gasto registrado" valor={formatarReais(gasto)} />
          <Numero rotulo="Carimbos dados" valor={String(Math.max(carimbosHoje, 0))} />
          <Numero rotulo="Novos clientes" valor={String(novos.count ?? 0)} />
        </dl>
        <p className="text-sm text-carvao/80">
          Recompensas resgatadas hoje: <strong>{resgates.count ?? 0}</strong>
        </p>
        {comRecompensa > 0 ? (
          <Link
            href="/painel/clientes?filtro=recompensa"
            className="flex min-h-14 items-center gap-3 rounded-2xl border-2 border-restinga bg-white px-4 font-semibold text-restinga"
          >
            <Gift aria-hidden className="size-6 shrink-0" />
            {comRecompensa === 1 ? "1 cliente com recompensa disponível" : `${comRecompensa} clientes com recompensa disponível`}
          </Link>
        ) : null}
      </section>
    </div>
  );
}

function Numero({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded-2xl bg-white p-4">
      <dt className="text-sm text-carvao/80">{rotulo}</dt>
      <dd className="mt-1 text-2xl font-semibold tabular-nums">{valor}</dd>
    </div>
  );
}
