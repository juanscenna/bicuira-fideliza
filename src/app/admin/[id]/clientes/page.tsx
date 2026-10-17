import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Download, Info } from "lucide-react";
import { exigirSuperAdmin } from "@/lib/auth";
import { carregarEstabelecimento } from "@/lib/admin/dados";
import { clientesDoEstabelecimento, type ClienteAdmin } from "@/lib/admin/clientes";
import { supabaseServidor } from "@/lib/supabase/servidor";
import { formatarReais } from "@/lib/dominio/dinheiro";
import { diasAtras, formatarDia } from "@/lib/dominio/datas";
import { formatarTelefone } from "@/lib/dominio/telefone";
import { classesBotao } from "@/components/ui/Botao";

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
type Periodo = keyof typeof PERIODOS;
const ORDENS = { gasto: "Mais gasto", visitas: "Mais visitas", recente: "Visita mais recente", cadastro: "Cadastro mais novo", nome: "Nome" } as const;
type Ordem = keyof typeof ORDENS;

const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : "—");
const media = (soma: number, n: number) => (n > 0 ? formatarReais(Math.round(soma / n)) : "—");

const ordenar: Record<Ordem, (a: ClienteAdmin, b: ClienteAdmin) => number> = {
  gasto: (a, b) => b.gastoCentavos - a.gastoCentavos || b.visitas - a.visitas,
  visitas: (a, b) => b.visitas - a.visitas || b.gastoCentavos - a.gastoCentavos,
  recente: (a, b) => (b.ultimaVisitaEm ?? "").localeCompare(a.ultimaVisitaEm ?? ""),
  cadastro: (a, b) => b.cadastroEm.localeCompare(a.cadastroEm),
  nome: (a, b) => a.nome.localeCompare(b.nome, "pt-BR"),
};

/** Admin: todos os clientes de um estabelecimento, com gasto e visitas, e as métricas do programa. */
export default async function ClientesDoEstabelecimento({ params, searchParams }: PageProps<"/admin/[id]/clientes">) {
  await exigirSuperAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const estab = await carregarEstabelecimento(id);
  if (!estab) notFound();

  const periodo: Periodo = typeof sp.periodo === "string" && sp.periodo in PERIODOS ? (sp.periodo as Periodo) : "tudo";
  const ordem: Ordem = typeof sp.ordem === "string" && sp.ordem in ORDENS ? (sp.ordem as Ordem) : "gasto";
  const link = (mudar: Record<string, string>) => `/admin/${id}/clientes?${new URLSearchParams({ periodo, ordem, ...mudar })}`;

  const supabase = await supabaseServidor();
  const [{ data }, clientes] = await Promise.all([
    supabase.rpc("metricas", { p_desde: periodo === "tudo" ? null : diasAtras(Number(periodo)), p_plano: null, p_estab: id }),
    clientesDoEstabelecimento(id),
  ]);
  const m = data as M;
  const lista = [...clientes].sort(ordenar[ordem]);
  const comVisita = clientes.filter((c) => c.visitas > 0);
  const gastoTotal = clientes.reduce((s, c) => s + c.gastoCentavos, 0);

  const cards = [
    { rotulo: "Clientes cadastrados", valor: String(m.clientes_cadastrados), nota: "Cartões criados no período." },
    { rotulo: "Visitas registradas", valor: String(m.total_visitas), nota: "Visitas lançadas no painel." },
    { rotulo: "Gasto registrado", valor: formatarReais(m.gasto_total_centavos), nota: "Soma dos valores das visitas." },
    { rotulo: "Ticket médio", valor: media(m.gasto_total_centavos, m.total_visitas), nota: "Gasto ÷ visitas." },
    { rotulo: "Taxa de retorno", valor: pct(m.clientes_que_retornaram, m.clientes_com_visita), nota: "Clientes com visita que já tinham vindo antes." },
    { rotulo: "Gasto em retornos", valor: formatarReais(m.gasto_retorno_centavos), nota: "Visitas que não foram a primeira do cliente." },
    { rotulo: "Recompensas resgatadas", valor: String(m.recompensas_resgatadas), nota: "Entregues no período." },
    { rotulo: "Clientes inativos (agora)", valor: String(m.clientes_inativos), nota: "Sem visita há mais dias que o limite." },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Link href={`/admin/${id}`} className="flex min-h-11 items-center gap-1 self-start font-semibold text-restinga">
          <ChevronLeft aria-hidden className="size-5" /> {estab.nome}
        </Link>
        <h1 className="font-display text-4xl text-restinga">Clientes e métricas</h1>
      </div>

      <section aria-labelledby="titulo-metricas" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="titulo-metricas" className="font-display text-2xl text-restinga">Métricas</h2>
          <Segmentado rotulo="Período" itens={PERIODOS} atual={periodo} href={(k) => link({ periodo: k })} />
        </div>
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {cards.map((c) => (
            <div key={c.rotulo} className="flex flex-col gap-1 rounded-2xl bg-white p-4">
              <dt className="text-sm font-semibold text-restinga">{c.rotulo}</dt>
              <dd className="font-display text-3xl leading-tight tabular-nums">{c.valor}</dd>
              <dd className="text-xs text-carvao/80">{c.nota}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="titulo-clientes" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="titulo-clientes" className="font-display text-2xl text-restinga">
            Clientes ({clientes.length})
          </h2>
          <a href={`/admin/${id}/clientes/csv`} className={classesBotao("secundario")} download>
            <Download aria-hidden className="size-5" /> Baixar planilha
          </a>
        </div>
        <p className="text-sm text-carvao/80">
          Desde o início: {comVisita.length} {comVisita.length === 1 ? "cliente visitou" : "clientes visitaram"} · {formatarReais(gastoTotal)} registrados ·
          média de {media(gastoTotal, comVisita.length)} por cliente que visitou.
        </p>
        <nav aria-label="Ordenar" className="flex flex-wrap gap-2">
          {(Object.keys(ORDENS) as Ordem[]).map((k) => (
            <Link
              key={k}
              href={link({ ordem: k })}
              aria-current={ordem === k ? "true" : undefined}
              className={`flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold ${ordem === k ? "bg-restinga text-areia" : "bg-white text-restinga"}`}
            >
              {ORDENS[k]}
            </Link>
          ))}
        </nav>

        {lista.length === 0 ? (
          <p className="rounded-2xl bg-white p-5 text-carvao/80">Nenhum cliente cadastrado ainda.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl bg-white">
            <table className="w-full min-w-[56rem] text-left">
              <caption className="sr-only">Clientes de {estab.nome} (desde o início)</caption>
              <thead>
                <tr className="border-b border-carvao/10 text-sm text-carvao/80">
                  <th scope="col" className="p-3 font-semibold">Cliente</th>
                  <th scope="col" className="p-3 font-semibold">Plano</th>
                  <th scope="col" className="p-3 text-right font-semibold">Visitas</th>
                  <th scope="col" className="p-3 text-right font-semibold">Gasto total</th>
                  <th scope="col" className="p-3 text-right font-semibold">Ticket médio</th>
                  <th scope="col" className="p-3 text-right font-semibold">Selos</th>
                  <th scope="col" className="p-3 text-right font-semibold">Resgates</th>
                  <th scope="col" className="p-3 font-semibold">Cadastro</th>
                  <th scope="col" className="p-3 font-semibold">Última visita</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((c) => (
                  <tr key={c.id} className={`border-b border-carvao/5 last:border-0 ${c.removido ? "text-carvao/60" : ""}`}>
                    <th scope="row" className="p-3 font-medium">
                      <span className="block">{c.nome}</span>
                      <span className="block text-sm font-normal whitespace-nowrap text-carvao/80">
                        <span className="font-mono">{c.codigo}</span>
                        {c.telefone ? ` · ${formatarTelefone(c.telefone)}` : ""}
                      </span>
                    </th>
                    <td className="p-3 text-sm">{c.plano === "morador" ? "Morador" : "Turista"}</td>
                    <td className="p-3 text-right tabular-nums">{c.visitas}</td>
                    <td className="p-3 text-right font-semibold tabular-nums">{formatarReais(c.gastoCentavos)}</td>
                    <td className="p-3 text-right tabular-nums">{media(c.gastoCentavos, c.visitas)}</td>
                    <td className="p-3 text-right tabular-nums">{c.carimbos}</td>
                    <td className="p-3 text-right tabular-nums">{c.resgates}</td>
                    <td className="p-3 text-sm">{formatarDia(c.cadastroEm)}</td>
                    <td className="p-3 text-sm">{c.ultimaVisitaEm ? formatarDia(c.ultimaVisitaEm) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="flex items-start gap-2 rounded-2xl border-2 border-restinga/20 bg-white/60 p-4 text-sm">
        <Info aria-hidden className="mt-0.5 size-5 shrink-0 text-restinga" />
        <span>
          Valores <strong>registrados no painel</strong> a cada visita (não são o faturamento do restaurante). Visitas removidas não contam. Telefones são
          dados pessoais dos clientes: use só para o programa de fidelidade (LGPD).
        </span>
      </p>
    </div>
  );
}

function Segmentado<K extends string>({ rotulo, itens, atual, href }: { rotulo: string; itens: Record<K, string>; atual: K; href: (k: K) => string }) {
  return (
    <nav aria-label={rotulo} className="flex rounded-2xl bg-white p-1">
      {(Object.keys(itens) as K[]).map((k) => (
        <Link
          key={k}
          href={href(k)}
          aria-current={atual === k ? "true" : undefined}
          className={`flex min-h-11 items-center justify-center rounded-xl px-3 text-sm font-semibold whitespace-nowrap ${atual === k ? "bg-restinga text-areia" : "text-restinga"}`}
        >
          {itens[k]}
        </Link>
      ))}
    </nav>
  );
}
