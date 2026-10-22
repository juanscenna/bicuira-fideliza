import Link from "next/link";
import { Info } from "lucide-react";
import { exigirDono } from "@/lib/auth";
import { termosDo, traduzir } from "@/temas/vocabulario";
import { supabaseServidor } from "@/lib/supabase/servidor";
import { formatarReais } from "@/lib/dominio/dinheiro";
import { diasAtras } from "@/lib/dominio/datas";

type M = {
  clientes_cadastrados: number;
  clientes_com_visita: number;
  clientes_que_retornaram: number;
  visitas_de_retorno: number;
  gasto_retorno_centavos: number;
  total_visitas: number;
  gasto_total_centavos: number;
  recompensas_resgatadas: number;
  clientes_inativos: number;
};

const PERIODOS = { "7": "7 dias", "30": "30 dias", "90": "90 dias", tudo: "Tudo" } as const;
const PUBLICOS = { todos: "Todos", morador: "Moradores", turista: "Turistas" } as const;
type Periodo = keyof typeof PERIODOS;
type Publico = keyof typeof PUBLICOS;

const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : "—");
const media = (soma: number, n: number) => (n > 0 ? formatarReais(Math.round(soma / n)) : "—");

export default async function Metricas({ searchParams }: PageProps<"/painel/metricas">) {
  const { estabelecimento } = await exigirDono();
  const t = (texto: string) => traduzir(texto, termosDo(estabelecimento));
  const sp = await searchParams;
  const periodo: Periodo = typeof sp.periodo === "string" && sp.periodo in PERIODOS ? (sp.periodo as Periodo) : "30";
  const publico: Publico = typeof sp.publico === "string" && sp.publico in PUBLICOS ? (sp.publico as Publico) : "todos";
  const desde = periodo === "tudo" ? null : diasAtras(Number(periodo));

  const supabase = await supabaseServidor();
  const [planosAtivos, ...resultados] = await Promise.all([
    supabase.from("planos").select("tipo").eq("ativo", true),
    ...([null, "morador", "turista"] as const).map((plano) =>
      supabase.rpc("metricas", { p_desde: desde, p_plano: plano, p_estab: estabelecimento.id }),
    ),
  ]);
  const [todos, morador, turista] = resultados.map((r) => r.data as M);
  const porPublico: Record<Publico, M> = { todos, morador, turista };
  const m = porPublico[publico];
  const doisPlanos = (planosAtivos.data ?? []).length > 1 || morador.clientes_cadastrados > 0 && turista.clientes_cadastrados > 0;

  const link = (mudar: Record<string, string>) => `/painel/metricas?${new URLSearchParams({ periodo, publico, ...mudar })}`;

  const indicadores: { rotulo: string; explicacao: string; valor: (x: M) => string }[] = ([
    { rotulo: "Clientes cadastrados", explicacao: "Novos cartões criados no período.", valor: (x) => String(x.clientes_cadastrados) },
    {
      rotulo: "Clientes que retornaram",
      explicacao: "Clientes com uma visita registrada no período que não foi a primeira deles.",
      valor: (x) => String(x.clientes_que_retornaram),
    },
    {
      rotulo: "Taxa de retorno",
      explicacao: "Dos clientes com visita registrada no período, quantos já tinham vindo antes.",
      valor: (x) => pct(x.clientes_que_retornaram, x.clientes_com_visita),
    },
    {
      rotulo: "Gasto em visitas de retorno",
      explicacao: "Soma dos valores registrados nas visitas que não foram a primeira de cada cliente.",
      valor: (x) => formatarReais(x.gasto_retorno_centavos),
    },
    {
      rotulo: "Ticket médio (retorno)",
      explicacao: "Gasto em visitas de retorno dividido pelo número dessas visitas.",
      valor: (x) => media(x.gasto_retorno_centavos, x.visitas_de_retorno),
    },
    { rotulo: "Visitas registradas", explicacao: "Todas as visitas lançadas no painel.", valor: (x) => String(x.total_visitas) },
    { rotulo: "Gasto total registrado", explicacao: "Soma dos valores de todas as visitas lançadas.", valor: (x) => formatarReais(x.gasto_total_centavos) },
    { rotulo: "Recompensas resgatadas", explicacao: "Recompensas entregues no período.", valor: (x) => String(x.recompensas_resgatadas) },
    {
      rotulo: "Clientes inativos (agora)",
      explicacao: "Sem visita há mais dias que o limite do programa. Não depende do período.",
      valor: (x) => String(x.clientes_inativos),
    },
  ] as { rotulo: string; explicacao: string; valor: (x: M) => string }[]).map((i) => ({ ...i, rotulo: t(i.rotulo), explicacao: t(i.explicacao) }));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-4xl text-restinga">Métricas</h1>

      <div className="flex flex-col gap-3">
        <Segmentado rotulo="Período" itens={PERIODOS} atual={periodo} href={(k) => link({ periodo: k })} />
        {doisPlanos ? <Segmentado rotulo="Público" itens={PUBLICOS} atual={publico} href={(k) => link({ publico: k })} /> : null}
      </div>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {indicadores.map((i) => (
          <div key={i.rotulo} className="flex flex-col gap-1 rounded-2xl bg-white p-5">
            <dt className="font-semibold text-restinga">{i.rotulo}</dt>
            <dd className="font-display text-4xl leading-tight text-carvao tabular-nums">{i.valor(m)}</dd>
            <dd className="text-sm text-carvao/80">{i.explicacao}</dd>
          </div>
        ))}
      </dl>

      {doisPlanos ? (
        <section aria-labelledby="titulo-comparacao" className="flex flex-col gap-3">
          <h2 id="titulo-comparacao" className="font-display text-2xl text-restinga">
            Moradores × turistas
          </h2>
          <div className="overflow-x-auto rounded-2xl bg-white">
            <table className="w-full min-w-[30rem] text-left">
              <caption className="sr-only">Indicadores separados por plano, período {PERIODOS[periodo]}</caption>
              <thead>
                <tr className="border-b border-carvao/10 text-sm text-carvao/80">
                  <th scope="col" className="p-3 font-semibold">Indicador</th>
                  <th scope="col" className="p-3 text-right font-semibold">Moradores</th>
                  <th scope="col" className="p-3 text-right font-semibold">Turistas</th>
                  <th scope="col" className="p-3 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {indicadores.map((i) => (
                  <tr key={i.rotulo} className="border-b border-carvao/5 last:border-0">
                    <th scope="row" className="p-3 font-medium">{i.rotulo}</th>
                    <td className="p-3 text-right tabular-nums">{i.valor(morador)}</td>
                    <td className="p-3 text-right tabular-nums">{i.valor(turista)}</td>
                    <td className="p-3 text-right font-semibold tabular-nums">{i.valor(todos)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-carvao/80">O plano considerado é o atual de cada cliente.</p>
        </section>
      ) : null}

      <p className="flex items-start gap-2 rounded-2xl border-2 border-restinga/20 bg-white/60 p-4">
        <Info aria-hidden className="mt-0.5 size-5 shrink-0 text-restinga" />
        <span>
          Os valores são os <strong>registrados no painel</strong> {t("a cada visita. Não representam o faturamento do restaurante.")} Os números mostram o que
          aconteceu, não o motivo: um cliente que retornou pode ter voltado por vários motivos.
        </span>
      </p>
    </div>
  );
}

function Segmentado<K extends string>({
  rotulo,
  itens,
  atual,
  href,
}: {
  rotulo: string;
  itens: Record<K, string>;
  atual: K;
  href: (k: K) => string;
}) {
  return (
    <nav aria-label={rotulo} className="flex items-center gap-3">
      <span className="w-16 shrink-0 text-sm font-semibold text-carvao/80">{rotulo}</span>
      <div className="flex flex-1 rounded-2xl bg-white p-1 sm:flex-none">
        {(Object.keys(itens) as K[]).map((k) => (
          <Link
            key={k}
            href={href(k)}
            aria-current={atual === k ? "true" : undefined}
            className={`flex min-h-11 flex-1 items-center justify-center rounded-xl px-3 text-sm font-semibold whitespace-nowrap sm:flex-none sm:px-4 ${
              atual === k ? "bg-restinga text-areia" : "text-restinga"
            }`}
          >
            {itens[k]}
          </Link>
        ))}
      </div>
    </nav>
  );
}
