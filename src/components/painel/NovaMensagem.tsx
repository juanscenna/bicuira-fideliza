"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronLeft, Search } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { buscarClientes, criarCampanha, preverPublico, type ResultadoCampanha } from "@/app/painel/avisos/acoes";
import type { TipoPublico } from "@/lib/notificacoes/regras";

type Previa = Awaited<ReturnType<typeof preverPublico>>;
const PASSOS = ["Mensagem", "Para quem", "Quando", "Revisar"] as const;

/** Mensagem personalizada em 4 passos curtos: texto → público → quando → revisar. */
export function NovaMensagem({ limite, publicos }: { limite: number; publicos: Record<TipoPublico, string> }) {
  const [passo, setPasso] = useState(0);
  const [texto, setTexto] = useState("");
  const [tipo, setTipo] = useState<TipoPublico>("todos");
  const [selecionados, setSelecionados] = useState<Map<string, string>>(new Map());
  const [agendar, setAgendar] = useState(false);
  const [quando, setQuando] = useState("");
  const [previa, setPrevia] = useState<Previa>(null);
  const [resultado, setResultado] = useState<ResultadoCampanha | null>(null);
  const [pendente, iniciar] = useTransition();

  const publico = { tipo, clientes: tipo === "selecao" ? [...selecionados.keys()] : undefined };
  const chavePublico = `${tipo}:${[...selecionados.keys()].join(",")}`;

  useEffect(() => {
    if (passo < 1) return;
    let ativo = true;
    preverPublico({ tipo, clientes: tipo === "selecao" ? [...selecionados.keys()] : undefined }).then((p) => ativo && setPrevia(p));
    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chavePublico, passo]);

  if (resultado?.ok) {
    return (
      <section role="status" className="flex flex-col gap-4 rounded-2xl bg-lima p-6">
        <p className="flex items-center gap-3 font-display text-2xl">
          <CheckCircle2 aria-hidden className="size-8" />
          {resultado.agendada ? "Mensagem agendada" : "Mensagem enviada"}
        </p>
        {resultado.agendada ? (
          <p className="text-lg">Ela será enviada em {new Date(resultado.quando!).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })}.</p>
        ) : (
          <p className="text-lg">
            {resultado.resumo?.enviados ?? 0} clientes receberam no cartão
            {resultado.resumo?.pulados ? `; ${resultado.resumo.pulados} foram pulados pelo limite de mensagens` : ""}.
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <Link href="/painel/avisos?aba=historico" className="inline-flex min-h-12 items-center rounded-xl bg-restinga px-5 font-semibold text-areia">
            Ver histórico
          </Link>
          <Botao
            variante="secundario"
            onClick={() => {
              setResultado(null);
              setTexto("");
              setPasso(0);
            }}
          >
            Nova mensagem
          </Botao>
        </div>
      </section>
    );
  }

  const podeAvancar = [texto.trim().length >= 3 && texto.length <= limite, (previa?.total ?? 0) > 0, !agendar || Boolean(quando), true][passo];

  return (
    <section className="flex flex-col gap-5 rounded-2xl bg-white p-5">
      <ol className="flex gap-2" aria-label="Passos">
        {PASSOS.map((p, i) => (
          <li key={p} aria-current={i === passo ? "step" : undefined} className="flex flex-1 flex-col gap-1">
            <span className={`h-1.5 rounded-full ${i <= passo ? "bg-restinga" : "bg-carvao/15"}`} />
            <span className={`text-xs font-semibold sm:text-sm ${i === passo ? "text-restinga" : "text-carvao/70"}`}>
              {i + 1}. {p}
            </span>
          </li>
        ))}
      </ol>

      {passo === 0 ? (
        <div className="flex flex-col gap-2">
          <label htmlFor="texto" className="font-display text-2xl text-restinga">
            O que você quer dizer?
          </label>
          <textarea
            id="texto"
            value={texto}
            onChange={(e) => setTexto(e.target.value.slice(0, limite))}
            rows={3}
            maxLength={limite}
            placeholder="Ex.: Hoje tem moqueca no almoço!"
            className="rounded-xl border-2 border-restinga/30 p-4 text-lg focus:border-restinga"
            aria-describedby="contador"
          />
          <p id="contador" className={`self-end text-sm font-semibold ${texto.length > limite - 15 ? "text-carvao" : "text-carvao/70"}`}>
            {texto.length}/{limite}
          </p>
          <p className="text-sm text-carvao/80">Mensagens curtas aparecem melhor no celular. O nome do restaurante vai junto.</p>
        </div>
      ) : null}

      {passo === 1 ? (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-2 font-display text-2xl text-restinga">Para quem?</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {(Object.keys(publicos) as TipoPublico[]).map((t) => (
              <label
                key={t}
                className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border-2 px-4 font-semibold ${tipo === t ? "border-restinga bg-restinga/5" : "border-carvao/15"}`}
              >
                <input type="radio" name="publico" checked={tipo === t} onChange={() => setTipo(t)} className="size-5 accent-restinga" />
                {publicos[t]}
              </label>
            ))}
          </div>
          {tipo === "selecao" ? <SelecaoClientes selecionados={selecionados} setSelecionados={setSelecionados} /> : null}
          <ContagemPublico previa={previa} />
        </fieldset>
      ) : null}

      {passo === 2 ? (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-2 font-display text-2xl text-restinga">Quando?</legend>
          <label className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border-2 px-4 font-semibold ${!agendar ? "border-restinga bg-restinga/5" : "border-carvao/15"}`}>
            <input type="radio" checked={!agendar} onChange={() => setAgendar(false)} className="size-5 accent-restinga" />
            Enviar agora
          </label>
          <label className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border-2 px-4 font-semibold ${agendar ? "border-restinga bg-restinga/5" : "border-carvao/15"}`}>
            <input type="radio" checked={agendar} onChange={() => setAgendar(true)} className="size-5 accent-restinga" />
            Agendar data e hora
          </label>
          {agendar ? (
            <label className="flex flex-col gap-1">
              <span className="text-sm font-semibold">Data e hora (horário de Brasília)</span>
              <input type="datetime-local" value={quando} onChange={(e) => setQuando(e.target.value)} className="min-h-12 rounded-xl border-2 border-restinga/30 px-3 text-lg" />
            </label>
          ) : null}
        </fieldset>
      ) : null}

      {passo === 3 ? (
        <div className="flex flex-col gap-4">
          <h2 className="font-display text-2xl text-restinga">Revisar</h2>
          <p className="rounded-xl bg-areia p-4 text-lg">“{texto.trim()}”</p>
          <ContagemPublico previa={previa} detalhado />
          <p>
            {agendar && quando
              ? `Envio agendado para ${new Date(`${quando}:00-03:00`).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })}. A quantidade final é calculada na hora do envio.`
              : "Envio imediato."}
          </p>
          {resultado && !resultado.ok ? (
            <p role="alert" className="rounded-xl border-2 border-sol px-4 py-3 font-medium">
              {resultado.erro}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap justify-between gap-3">
        {passo > 0 ? (
          <Botao variante="secundario" onClick={() => setPasso(passo - 1)}>
            <ChevronLeft aria-hidden className="size-5" /> Voltar
          </Botao>
        ) : (
          <span />
        )}
        {passo < 3 ? (
          <Botao disabled={!podeAvancar} onClick={() => setPasso(passo + 1)}>
            Continuar
          </Botao>
        ) : (
          <Botao
            grande
            disabled={pendente || (previa?.enviariam ?? 0) === 0 && !agendar}
            onClick={() => iniciar(async () => setResultado(await criarCampanha(texto, publico, agendar ? quando : null)))}
          >
            {pendente ? "Enviando…" : agendar ? "Agendar mensagem" : `Enviar para ${previa?.enviariam ?? 0} ${previa?.enviariam === 1 ? "cliente" : "clientes"}`}
          </Botao>
        )}
      </div>
    </section>
  );
}

function ContagemPublico({ previa, detalhado }: { previa: Previa; detalhado?: boolean }) {
  if (!previa) return <p className="text-carvao/80">Calculando…</p>;
  return (
    <div aria-live="polite" className="rounded-xl border-2 border-restinga/20 p-4">
      <p className="text-lg font-semibold">
        {previa.enviariam} {previa.enviariam === 1 ? "cliente vai receber" : "clientes vão receber"}
      </p>
      {previa.pulados > 0 ? (
        <p className="text-carvao/90">
          {previa.pulados} {previa.pulados === 1 ? "será pulado" : "serão pulados"}:{" "}
          {Object.entries(previa.motivosPulo)
            .map(([m, n]) => `${n} pelo ${m}`)
            .join(", ")}
          .
        </p>
      ) : null}
      {detalhado ? (
        <p className="mt-1 text-sm text-carvao/80">
          Cada cliente recebe no máximo {previa.maxSemana} mensagens personalizadas por semana.
        </p>
      ) : null}
    </div>
  );
}

function SelecaoClientes({
  selecionados,
  setSelecionados,
}: {
  selecionados: Map<string, string>;
  setSelecionados: (m: Map<string, string>) => void;
}) {
  const [q, setQ] = useState("");
  const [lista, setLista] = useState<{ id: string; nome: string; codigo: string; plano_tipo: string }[]>([]);
  useEffect(() => {
    let ativo = true;
    const t = setTimeout(() => buscarClientes(q).then((r) => ativo && setLista(r)), 250);
    return () => {
      ativo = false;
      clearTimeout(t);
    };
  }, [q]);
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-areia/60 p-3">
      <label className="flex items-center gap-2 rounded-xl border-2 border-restinga/30 bg-white px-3">
        <Search aria-hidden className="size-5 text-restinga" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar nome ou código" aria-label="Buscar clientes" className="min-h-12 w-full focus:outline-none" />
      </label>
      <p className="text-sm font-semibold">{selecionados.size} selecionados</p>
      <ul className="max-h-72 overflow-y-auto rounded-xl bg-white">
        {lista.map((c) => (
          <li key={c.id}>
            <label className="flex min-h-12 cursor-pointer items-center gap-3 px-3 hover:bg-areia/50">
              <input
                type="checkbox"
                checked={selecionados.has(c.id)}
                onChange={(e) => {
                  const m = new Map(selecionados);
                  if (e.target.checked) m.set(c.id, c.nome);
                  else m.delete(c.id);
                  setSelecionados(m);
                }}
                className="size-5 accent-restinga"
              />
              <span className="flex-1">{c.nome}</span>
              <span className="font-mono text-sm">{c.codigo}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
