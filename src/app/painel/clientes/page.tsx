import Link from "next/link";
import { ChevronRight, Gift, Search } from "lucide-react";
import { exigirDono } from "@/lib/auth";
import { termosDo, traduzir } from "@/temas/vocabulario";
import { supabaseServidor } from "@/lib/supabase/servidor";
import { formatarReais } from "@/lib/dominio/dinheiro";
import { relativo } from "@/lib/dominio/datas";
import { formatarTelefone } from "@/lib/dominio/telefone";

const FILTROS = {
  todos: "Todos",
  moradores: "Moradores",
  turistas: "Turistas",
  perto: "Perto da recompensa",
  recompensa: "Recompensa disponível",
  inativos: "Inativos",
} as const;

const ORDENS = {
  ultima: { rotulo: "Última visita", coluna: "ultima_visita_em" },
  gasto: { rotulo: "Total gasto", coluna: "total_gasto_centavos" },
  visitas: { rotulo: "Nº de visitas", coluna: "total_visitas" },
} as const;

const LIMITE = 200;

type Filtro = keyof typeof FILTROS;
type Ordem = keyof typeof ORDENS;

export default async function Clientes({ searchParams }: PageProps<"/painel/clientes">) {
  const { estabelecimento } = await exigirDono();
  const termos = termosDo(estabelecimento);
  const t = (texto: string) => traduzir(texto, termos);
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 60) : "";
  const filtro: Filtro = typeof sp.filtro === "string" && sp.filtro in FILTROS ? (sp.filtro as Filtro) : "todos";
  const ordem: Ordem = typeof sp.ordem === "string" && sp.ordem in ORDENS ? (sp.ordem as Ordem) : "ultima";

  const supabase = await supabaseServidor();
  let consulta = supabase
    .from("clientes_resumo")
    .select("id, nome, telefone, codigo, plano_tipo, carimbos_atuais, meta, recompensa_disponivel, ultima_visita_em, inativo, total_visitas, total_gasto_centavos", { count: "exact" });

  if (q) {
    const digitos = q.replace(/\D/g, "");
    const codigo = q.toUpperCase();
    const nome = q.replace(/[%_,()*\\]/g, " ");
    const ou = [`nome.ilike.*${nome}*`];
    if (/^[A-Z]\d{0,4}$/.test(codigo)) ou.push(`codigo.ilike.${codigo}*`);
    if (digitos.length >= 4) ou.push(`telefone.ilike.*${digitos}*`);
    consulta = consulta.or(ou.join(","));
  }
  if (filtro === "moradores") consulta = consulta.eq("plano_tipo", "morador");
  if (filtro === "turistas") consulta = consulta.eq("plano_tipo", "turista");
  if (filtro === "recompensa") consulta = consulta.eq("recompensa_disponivel", true);
  if (filtro === "inativos") consulta = consulta.eq("inativo", true);

  const { data, count } = await consulta
    .order(ORDENS[ordem].coluna, { ascending: false, nullsFirst: false })
    .order("nome")
    .limit(filtro === "perto" ? 2000 : LIMITE);

  // "Perto da recompensa": faltam 1 ou 2 carimbos (ver docs/DECISOES.md)
  const lista = (data ?? []).filter((c) => filtro !== "perto" || (c.meta - c.carimbos_atuais >= 1 && c.meta - c.carimbos_atuais <= 2)).slice(0, LIMITE);
  const total = filtro === "perto" ? lista.length : (count ?? 0);

  const link = (mudar: Record<string, string>) => {
    const p = new URLSearchParams({ ...(q ? { q } : {}), filtro, ordem, ...mudar });
    if (p.get("filtro") === "todos") p.delete("filtro");
    if (p.get("ordem") === "ultima") p.delete("ordem");
    return `/painel/clientes${p.size ? `?${p}` : ""}`;
  };

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-4xl text-restinga">Clientes</h1>

      <form action="/painel/clientes" role="search" className="flex gap-2">
        {filtro !== "todos" ? <input type="hidden" name="filtro" value={filtro} /> : null}
        {ordem !== "ultima" ? <input type="hidden" name="ordem" value={ordem} /> : null}
        <label htmlFor="busca" className="sr-only">
          Buscar por nome, telefone ou código
        </label>
        <input
          id="busca"
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Nome, telefone ou código"
          enterKeyHint="search"
          className="min-h-14 w-full min-w-0 rounded-2xl border-2 border-restinga/30 bg-white px-4 text-lg focus:border-restinga"
        />
        <button type="submit" aria-label="Buscar" className="flex min-h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-restinga text-areia">
          <Search aria-hidden className="size-6" />
        </button>
      </form>

      <nav aria-label="Filtros" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
        {(Object.keys(FILTROS) as Filtro[]).filter((f) => termos.mostrarPlanos || (f !== "moradores" && f !== "turistas")).map((f) => (
          <Link
            key={f}
            href={link({ filtro: f })}
            aria-current={filtro === f ? "true" : undefined}
            className={`flex min-h-11 shrink-0 items-center rounded-full border-2 px-4 font-semibold whitespace-nowrap ${
              filtro === f ? "border-restinga bg-restinga text-areia" : "border-restinga/30 bg-white text-restinga"
            }`}
          >
            {FILTROS[f]}
          </Link>
        ))}
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-carvao/80">
          {total} {total === 1 ? "cliente" : "clientes"}
          {total > LIMITE ? ` · mostrando os ${LIMITE} primeiros` : ""}
        </p>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-carvao/80">Ordenar:</span>
          {(Object.keys(ORDENS) as Ordem[]).filter((o) => !(termos.porEstadia && o === "gasto")).map((o) => (
            <Link
              key={o}
              href={link({ ordem: o })}
              aria-current={ordem === o ? "true" : undefined}
              className={`min-h-11 content-center rounded-lg px-2 font-semibold ${ordem === o ? "text-restinga underline underline-offset-4" : "text-carvao/80"}`}
            >
              {t(ORDENS[o].rotulo)}
            </Link>
          ))}
        </div>
      </div>

      {lista.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-center text-lg">
          {q || filtro !== "todos" ? "Nenhum cliente encontrado com esses filtros." : "Ainda não há clientes. Eles aparecem aqui quando se cadastram pelo QR Code."}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-carvao/10 overflow-hidden rounded-2xl bg-white">
          {lista.map((c) => (
            <li key={c.id}>
              <Link href={`/painel/clientes/${c.id}`} className="flex items-center gap-3 p-4 hover:bg-areia/50">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2 text-lg font-semibold">
                    <span className="truncate">{c.nome}</span>
                    {c.recompensa_disponivel ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-lima px-2 py-0.5 text-sm">
                        <Gift aria-hidden className="size-4" /> Recompensa
                      </span>
                    ) : null}
                  </p>
                  <p className="text-sm text-carvao/80">
                    <span className="font-mono font-semibold text-carvao">{c.codigo}</span> · {formatarTelefone(c.telefone)}
                    {termos.mostrarPlanos ? ` · ${c.plano_tipo === "morador" ? "Morador" : "Turista"}` : null}
                  </p>
                  <p className="text-sm text-carvao/80">
                    {t("Última visita")}: {relativo(c.ultima_visita_em)}
                    {c.inativo ? " (inativo)" : ""} · {c.total_visitas} {c.total_visitas === 1 ? t("visita") : t("visitas")}
                    {termos.porEstadia ? null : ` · ${formatarReais(Number(c.total_gasto_centavos))}`}
                  </p>
                </div>
                <p className="shrink-0 text-right font-display text-2xl text-restinga tabular-nums">
                  {Math.min(c.carimbos_atuais, c.meta)}/{c.meta}
                </p>
                <ChevronRight aria-hidden className="size-5 shrink-0 text-restinga" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
