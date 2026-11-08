// "Selos dados" por mês: base da cobrança (valor fixo + valor por selo). Usado no painel do dono e no admin.
// Regra do que conta: supabase/migrations/20261108001500_selos_dados.sql e docs/DECISOES.md.

export type SelosMes = { mes: string; selos: number };

const nomeMes = (mes: string) =>
  new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${mes}T12:00:00Z`));

export function SelosDados({ meses, explicacao }: { meses: SelosMes[]; explicacao: string }) {
  const [atual, ...anteriores] = meses;
  if (!atual) return null;
  return (
    <section aria-labelledby="titulo-selos-dados" className="flex flex-col gap-4 rounded-2xl bg-white p-5">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="titulo-selos-dados" className="font-display text-2xl text-restinga">
            Selos dados
          </h2>
          <p className="text-sm text-carvao/80">{explicacao}</p>
        </div>
        <p className="flex flex-col items-start gap-1">
          <span className="font-display text-5xl leading-none text-carvao tabular-nums">{atual.selos}</span>
          <span className="text-sm font-semibold text-restinga first-letter:uppercase">{nomeMes(atual.mes)} (até agora)</span>
        </p>
      </div>
      {anteriores.length ? (
        <table className="w-full text-left">
          <caption className="sr-only">Selos dados nos meses anteriores</caption>
          <thead>
            <tr className="border-b border-carvao/10 text-sm text-carvao/80">
              <th scope="col" className="py-2 font-semibold">Mês</th>
              <th scope="col" className="py-2 text-right font-semibold">Selos dados</th>
            </tr>
          </thead>
          <tbody>
            {anteriores.map((m) => (
              <tr key={m.mes} className="border-b border-carvao/5 last:border-0">
                <th scope="row" className="py-2 font-normal first-letter:uppercase">{nomeMes(m.mes)}</th>
                <td className="py-2 text-right font-semibold tabular-nums">{m.selos}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </section>
  );
}
