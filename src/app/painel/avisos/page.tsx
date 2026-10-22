import Link from "next/link";
import { exigirDono } from "@/lib/auth";
import { automaticaDo, termosDo, traduzir, type Termos } from "@/temas/vocabulario";
import { supabaseServidor } from "@/lib/supabase/servidor";
import { AUTOMATICAS, PUBLICOS, type TipoAutomatica, type TipoPublico } from "@/lib/notificacoes/regras";
import { LIMITE_MENSAGEM } from "@/lib/wallet/conteudo";
import { formatarDiaHora } from "@/lib/dominio/datas";
import { NovaMensagem } from "@/components/painel/NovaMensagem";
import { BotaoCancelarCampanha, InterruptorAutomacao } from "@/components/painel/AvisosControles";

const ABAS = { nova: "Nova mensagem", historico: "Histórico", automaticas: "Automáticas" } as const;
type Aba = keyof typeof ABAS;

const STATUS: Record<string, string> = { agendada: "Agendada", enviando: "Enviando", enviada: "Enviada", cancelada: "Cancelada" };

export default async function Avisos({ searchParams }: PageProps<"/painel/avisos">) {
  const { estabelecimento } = await exigirDono();
  const termos = termosDo(estabelecimento.slug);
  const publicos = Object.fromEntries(
    Object.entries(PUBLICOS)
      .filter(([k]) => termos.mostrarPlanos || (k !== "moradores" && k !== "turistas"))
      .map(([k, v]) => [k, traduzir(v, termos)]),
  ) as typeof PUBLICOS;
  const sp = await searchParams;
  const aba: Aba = typeof sp.aba === "string" && sp.aba in ABAS ? (sp.aba as Aba) : "nova";
  const supabase = await supabaseServidor();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-4xl text-restinga">Avisos</h1>
        <p className="mt-1 text-carvao/80">Mensagens aparecem no cartão do cliente (Wallet e cartão no navegador).</p>
      </div>

      <nav aria-label="Seções de avisos" className="flex rounded-2xl bg-white p-1">
        {(Object.keys(ABAS) as Aba[]).map((a) => (
          <Link
            key={a}
            href={`/painel/avisos?aba=${a}`}
            aria-current={aba === a ? "page" : undefined}
            className={`flex min-h-12 flex-1 items-center justify-center rounded-xl px-2 text-center text-sm font-semibold sm:text-base ${
              aba === a ? "bg-restinga text-areia" : "text-restinga"
            }`}
          >
            {ABAS[a]}
          </Link>
        ))}
      </nav>

      {aba === "nova" ? <NovaMensagem limite={LIMITE_MENSAGEM} publicos={publicos} /> : null}
      {aba === "historico" ? <Historico supabase={supabase} termos={termos} /> : null}
      {aba === "automaticas" ? <Automaticas supabase={supabase} estabelecimentoId={estabelecimento.id} termos={termos} /> : null}
    </div>
  );
}

type Supa = Awaited<ReturnType<typeof supabaseServidor>>;

async function Historico({ supabase, termos }: { supabase: Supa; termos: Termos }) {
  const [{ data: campanhas }, { data: automaticas }] = await Promise.all([
    supabase.from("campanhas").select("id, texto, publico, agendada_para, status, total_alvo, total_enviados, total_pulados").order("agendada_para", { ascending: false }).limit(30),
    supabase.from("envios").select("id, texto, automacao_tipo, status, criado_em, clientes (nome)").eq("origem", "automatica").order("criado_em", { ascending: false }).limit(20),
  ]);
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl text-restinga">Mensagens personalizadas</h2>
        {(campanhas ?? []).length === 0 ? (
          <p className="rounded-2xl bg-white p-5">Nenhuma mensagem ainda.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {(campanhas ?? []).map((c) => (
              <li key={c.id} className="flex flex-col gap-2 rounded-2xl bg-white p-4">
                <p className="text-lg">“{c.texto}”</p>
                <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-carvao/80">
                  <span className={`rounded-full px-2.5 py-0.5 font-semibold text-carvao ${c.status === "enviada" ? "bg-lima" : "bg-carvao/10"}`}>
                    {STATUS[c.status]}
                  </span>
                  <span>{formatarDiaHora(c.agendada_para)}</span>
                  <span>{traduzir(PUBLICOS[(c.publico as { tipo: TipoPublico }).tipo] ?? "", termos)}</span>
                  {c.status === "enviada" ? (
                    <span>
                      {c.total_enviados} enviados{c.total_pulados ? ` · ${c.total_pulados} pulados (limite)` : ""}
                    </span>
                  ) : null}
                </p>
                {c.status === "agendada" ? <BotaoCancelarCampanha id={c.id} /> : null}
              </li>
            ))}
          </ul>
        )}
        <p className="text-sm text-carvao/80">
          “Enviado” quer dizer que a mensagem foi colocada no cartão. A entrega da notificação depende do celular do cliente e não é
          garantida.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl text-restinga">Últimas automáticas</h2>
        {(automaticas ?? []).length === 0 ? (
          <p className="rounded-2xl bg-white p-5">Nenhuma automática enviada ainda.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-carvao/10 rounded-2xl bg-white">
            {(automaticas ?? []).map((e) => (
              <li key={e.id} className="p-4">
                <p className="font-semibold">
                  {AUTOMATICAS[e.automacao_tipo as TipoAutomatica] ? automaticaDo(e.automacao_tipo as TipoAutomatica, termos).titulo : null} · {(e.clientes as unknown as { nome: string } | null)?.nome}
                </p>
                <p className="text-sm text-carvao/80">
                  {formatarDiaHora(e.criado_em)} · {e.status === "enviado" ? "enviado" : "pulado"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

async function Automaticas({ supabase, estabelecimentoId, termos }: { supabase: Supa; estabelecimentoId: string; termos: Termos }) {
  const [{ data: automacoes }, { data: planos }] = await Promise.all([
    supabase.from("automacoes").select("tipo, ativa_morador, ativa_turista").eq("estabelecimento_id", estabelecimentoId),
    supabase.from("planos").select("tipo").eq("ativo", true),
  ]);
  const tipos = new Set((planos ?? []).map((p) => p.tipo));
  return (
    <ul className="flex flex-col gap-3">
      {(Object.keys(AUTOMATICAS) as TipoAutomatica[]).map((tipo) => {
        const a = automacoes?.find((x) => x.tipo === tipo);
        return (
          <li key={tipo} className="flex flex-col gap-3 rounded-2xl bg-white p-5">
            <div>
              <p className="text-lg font-semibold text-restinga">{automaticaDo(tipo, termos).titulo}</p>
              <p className="text-carvao/80">{automaticaDo(tipo, termos).quando}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {tipos.has("morador") ? <InterruptorAutomacao tipo={tipo} plano="morador" ativa={Boolean(a?.ativa_morador)} /> : null}
              {tipos.has("turista") ? <InterruptorAutomacao tipo={tipo} plano="turista" ativa={Boolean(a?.ativa_turista)} /> : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
