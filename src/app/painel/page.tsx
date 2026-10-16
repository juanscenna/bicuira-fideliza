import { exigirDono } from "@/lib/auth";
import { supabaseServidor } from "@/lib/supabase/servidor";
import { formatarReais } from "@/lib/dominio/dinheiro";

export default async function PainelInicio() {
  const { estabelecimento } = await exigirDono();
  const supabase = await supabaseServidor();

  // Lido com o login do dono: o RLS só devolve dados do próprio estabelecimento.
  const [{ data: regras }, { data: planos }] = await Promise.all([
    supabase
      .from("estabelecimentos")
      .select("gasto_minimo_centavos")
      .eq("id", estabelecimento.id)
      .single(),
    supabase.from("planos").select("tipo, ativo, carimbos_meta, recompensa_texto").order("tipo"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-4xl text-restinga">Início</h1>

      <section className="rounded-2xl border-2 border-dashed border-restinga/30 bg-white/60 p-6">
        <p className="font-semibold text-restinga">Chega na etapa 4</p>
        <p className="mt-1">
          Aqui vai ficar o campo grande de código do cartão e o botão para escanear o QR Code.
        </p>
      </section>

      <section className="rounded-2xl bg-white p-6">
        <h2 className="font-display text-2xl text-restinga">Regras do programa</h2>
        <p className="mt-1 text-carvao/80">Definidas pela Bicuíra. Para mudar, fale com a equipe.</p>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-sm text-carvao/80">Gasto mínimo por visita</dt>
            <dd className="text-xl font-semibold">{formatarReais(regras?.gasto_minimo_centavos ?? 0)}</dd>
          </div>
          {(planos ?? [])
            .filter((p) => p.ativo)
            .map((p) => (
              <div key={p.tipo}>
                <dt className="text-sm text-carvao/80">{p.tipo === "morador" ? "Moradores" : "Turistas"}</dt>
                <dd className="text-xl font-semibold">
                  {p.carimbos_meta} carimbos = {p.recompensa_texto}
                </dd>
              </div>
            ))}
        </dl>
      </section>
    </div>
  );
}
