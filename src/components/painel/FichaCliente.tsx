"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useTermos } from "./Termos";
import { AlertTriangle, Check, CheckCircle2, Gift, Minus, Pencil, Plus, Trash2, Undo2, X } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { formatarReais, lerReais } from "@/lib/dominio/dinheiro";
import { formatarDiaHora } from "@/lib/dominio/datas";
import {
  ajustarCarimbos,
  desfazerAjuste,
  desfazerVisita,
  editarVisita,
  registrarVisita,
  removerVisita,
  resgatar,
  trocarPlano,
  type Resultado,
} from "@/app/painel/acoes";

type Plano = "morador" | "turista";
const NOME_PLANO: Record<Plano, string> = { morador: "Morador", turista: "Turista" };

export type ItemHistorico =
  | {
      tipo: "visita";
      id: string;
      valor_centavos: number;
      descricao: string | null;
      gerou_carimbo: boolean;
      criado_em: string;
      editado_em: string | null;
      desfeita_em: string | null;
    }
  | {
      tipo: "evento";
      tipo_evento: string;
      id: string;
      delta: number;
      saldo_apos: number;
      motivo: string | null;
      dados: Record<string, unknown>;
      criado_em: string;
    };

type Cliente = {
  id: string;
  nome: string;
  telefone: string;
  codigo: string;
  plano: Plano;
  carimbos: number;
  meta: number;
  recompensa: string;
  recompensaDisponivel: boolean;
  totalVisitas: number;
  totalGasto: number;
};

type Aviso = { texto: string; tipo: "ok" | "atencao"; desfazer?: () => Promise<Resultado> };

const TEMPO_DESFAZER_MS = 10_000;

export function FichaCliente({
  cliente,
  gastoMinimo,
  planos,
  historico,
  focarValor,
}: {
  cliente: Cliente;
  gastoMinimo: number;
  planos: { tipo: string; carimbos_meta: number; recompensa_texto: string }[];
  historico: ItemHistorico[];
  focarValor: boolean;
}) {
  const { t, termos } = useTermos();
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [visitaFeita, setVisitaFeita] = useState<Aviso | null>(null);
  const [pendente, iniciar] = useTransition();
  const primeiroNome = cliente.nome.split(" ")[0];

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), aviso.desfazer ? TEMPO_DESFAZER_MS : 5000);
    return () => clearTimeout(t);
  }, [aviso]);

  function executar(acao: () => Promise<Resultado>, sucesso: (r: Extract<Resultado, { ok: true }>) => void) {
    iniciar(async () => {
      const r = await acao();
      if (r.ok) sucesso(r);
      else setAviso({ texto: r.erro, tipo: "atencao" });
    });
  }

  function desfazerAgora(fn: () => Promise<Resultado>) {
    setAviso(null);
    setVisitaFeita(null);
    executar(fn, (r) => setAviso({ texto: `Desfeito. ${primeiroNome} tem ${r.estado.carimbos} de ${r.estado.meta}.`, tipo: "ok" }));
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Identificação */}
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-4xl leading-tight text-restinga">{cliente.nome}</h1>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-lg">
          <span className="font-mono font-semibold tracking-wider">{cliente.codigo}</span>
          <span aria-hidden className="text-carvao/40">·</span>
          <span>{cliente.telefone}</span>
          <span aria-hidden className="text-carvao/40">·</span>
          <TrocarPlano cliente={cliente} planos={planos} pendente={pendente} aoTrocar={(p) =>
            executar(() => trocarPlano(cliente.id, p), (r) =>
              setAviso({
                texto: `Plano trocado para ${t(NOME_PLANO[p])}. ${primeiroNome} tem ${r.estado.carimbos} de ${r.estado.meta}.${r.estado.completou ? " Recompensa disponível!" : ""}`,
                tipo: "ok",
              }),
            )
          } />
        </p>
        <p className="text-sm text-carvao/80">
          {cliente.totalVisitas} {cliente.totalVisitas === 1 ? t("visita") : t("visitas")}
          {termos.porEstadia ? null : ` · ${formatarReais(cliente.totalGasto)} registrados`}
        </p>
      </header>

      {/* Progresso */}
      <section aria-label="Carimbos" className="rounded-2xl bg-white p-5">
        <div className="flex items-end justify-between gap-4">
          <p className="font-display text-5xl leading-none text-restinga tabular-nums">
            {Math.min(cliente.carimbos, cliente.meta)}
            <span className="text-3xl text-carvao/60"> de {cliente.meta}</span>
          </p>
          <p className="text-right font-semibold">
            {cliente.recompensaDisponivel ? cliente.recompensa : `Faltam ${cliente.meta - cliente.carimbos} para ${cliente.recompensa}`}
          </p>
        </div>
        <ol className="mt-4 flex flex-wrap gap-2" aria-hidden>
          {Array.from({ length: cliente.meta }, (_, i) => (
            <li
              key={i}
              data-selo={i < cliente.carimbos ? "feito" : "vazio"}
              className={`flex size-9 items-center justify-center rounded-full border-2 ${
                i < cliente.carimbos ? "border-restinga bg-restinga text-areia" : "border-dashed border-restinga/40"
              }`}
            >
              {i < cliente.carimbos ? <Check className="size-5" strokeWidth={3} /> : null}
            </li>
          ))}
        </ol>
      </section>

      {/* Recompensa disponível: ação principal */}
      {cliente.recompensaDisponivel ? (
        <Resgatar
          cliente={cliente}
          pendente={pendente}
          aoResgatar={() =>
            executar(() => resgatar(cliente.id), (r) => {
              setVisitaFeita(null);
              setAviso({ texto: `Recompensa entregue: ${r.estado.recompensa_entregue}. O cartão voltou a 0.`, tipo: "ok" });
            })
          }
        />
      ) : null}

      {/* Registrar visita (ou resultado da última) */}
      {visitaFeita ? (
        <section role="status" className={`flex flex-col gap-4 rounded-2xl p-5 ${visitaFeita.tipo === "ok" ? "bg-lima" : "border-2 border-sol bg-white"}`}>
          <p className="flex items-start gap-3 text-xl font-semibold">
            {visitaFeita.tipo === "ok" ? (
              <CheckCircle2 aria-hidden className="mt-0.5 size-7 shrink-0" />
            ) : (
              <AlertTriangle aria-hidden className="mt-0.5 size-7 shrink-0 text-sol" />
            )}
            {visitaFeita.texto}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/painel" className="inline-flex min-h-14 flex-1 items-center justify-center rounded-xl bg-restinga px-6 text-lg font-semibold text-areia">
              Próximo cliente
            </Link>
            {visitaFeita.desfazer ? (
              <Botao variante="secundario" grande disabled={pendente} onClick={() => desfazerAgora(visitaFeita.desfazer!)}>
                <Undo2 aria-hidden className="size-5" /> Desfazer
              </Botao>
            ) : null}
            <Botao variante="texto" onClick={() => setVisitaFeita(null)}>
              Registrar outra
            </Botao>
          </div>
        </section>
      ) : (
        <RegistrarVisita
          cliente={cliente}
          gastoMinimo={gastoMinimo}
          focar={focarValor}
          pendente={pendente}
          aoRegistrar={(valor, descricao) =>
            executar(() => registrarVisita(cliente.id, valor, descricao), (r) => {
              const e = r.estado;
              const desfazer = () => desfazerVisita(e.visita_id!);
              if (e.gerou_carimbo) {
                setVisitaFeita({
                  tipo: "ok",
                  desfazer,
                  texto: e.completou
                    ? t("Visita registrada") + ` — cartão completo! ${primeiroNome} ganhou: ${e.recompensa}.`
                    : t("Visita registrada") + ` — ${primeiroNome} agora tem ${e.carimbos} de ${e.meta}.`,
                });
              } else if (e.motivo === "abaixo_minimo") {
                setVisitaFeita({ tipo: "atencao", desfazer, texto: t(`Abaixo do mínimo de ${formatarReais(gastoMinimo)} — visita registrada sem carimbo.`) });
              } else {
                setVisitaFeita({ tipo: "atencao", desfazer, texto: t("Visita registrada sem carimbo: o cartão já está completo. Resgate a recompensa.") });
              }
            })
          }
        />
      )}

      {/* Ajuste manual */}
      <AjusteManual
        cliente={cliente}
        pendente={pendente}
        aoAjustar={(delta, motivo) =>
          executar(() => ajustarCarimbos(cliente.id, delta, motivo), (r) =>
            setAviso({
              texto: `${delta > 0 ? "+1" : "−1"} carimbo. ${primeiroNome} tem ${r.estado.carimbos} de ${r.estado.meta}.`,
              tipo: "ok",
              desfazer: () => desfazerAjuste(r.estado.evento_id!),
            }),
          )
        }
      />

      <Historico
        historico={historico}
        gastoMinimo={gastoMinimo}
        pendente={pendente}
        aoRemover={(visitaId, fechar) =>
          executar(() => removerVisita(visitaId), (r) => {
            fechar();
            const e = r.estado;
            setAviso({
              tipo: e.aviso ? "atencao" : "ok",
              texto:
                e.aviso === "resgate_posterior"
                  ? t("Visita removida. O cartão não mudou porque esse carimbo já foi usado num resgate.")
                  : e.delta === -1
                    ? t("Visita removida e carimbo retirado.") + ` ${primeiroNome} tem ${e.carimbos} de ${e.meta}.`
                    : t("Visita removida."),
            });
          })
        }
        aoEditar={(visitaId, valor, descricao, fechar) =>
          executar(() => editarVisita(visitaId, valor, descricao), (r) => {
            fechar();
            const e = r.estado;
            setAviso({
              tipo: e.aviso ? "atencao" : "ok",
              texto:
                e.aviso === "resgate_posterior"
                  ? t("Valor corrigido. O carimbo não mudou porque já houve um resgate depois desta visita.")
                  : e.aviso === "cartao_cheio"
                    ? "Valor corrigido. Não ganhou carimbo porque o cartão já está completo."
                    : e.delta === 1
                      ? t("Valor corrigido: a visita passou a ganhar carimbo.")
                      : e.delta === -1
                        ? t("Valor corrigido: a visita ficou abaixo do mínimo e perdeu o carimbo.")
                        : t("Visita corrigida."),
            });
          })
        }
      />

      {/* Aviso flutuante com "Desfazer" */}
      {aviso ? (
        <div
          role="status"
          className={`fixed inset-x-3 bottom-20 z-40 mx-auto flex max-w-lg items-center gap-3 rounded-2xl px-4 py-3 shadow-lg md:bottom-6 ${
            aviso.tipo === "ok" ? "bg-carvao text-areia" : "border-2 border-sol bg-white text-carvao"
          }`}
        >
          <p className="flex-1 font-medium">{aviso.texto}</p>
          {aviso.desfazer ? (
            <button
              type="button"
              disabled={pendente}
              onClick={() => desfazerAgora(aviso.desfazer!)}
              className="min-h-11 rounded-xl px-3 font-semibold text-lima underline underline-offset-4"
            >
              Desfazer
            </button>
          ) : null}
          <button type="button" aria-label="Fechar aviso" onClick={() => setAviso(null)} className="flex size-11 items-center justify-center">
            <X aria-hidden className="size-5" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------------- */

function RegistrarVisita({
  cliente,
  gastoMinimo,
  focar,
  pendente,
  aoRegistrar,
}: {
  cliente: Cliente;
  gastoMinimo: number;
  focar: boolean;
  pendente: boolean;
  aoRegistrar: (valor: string, descricao: string) => void;
}) {
  const { t, termos } = useTermos();
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [comDescricao, setComDescricao] = useState(false);
  const [tentou, setTentou] = useState(false);
  const centavos = lerReais(valor);
  const cheio = cliente.carimbos >= cliente.meta;

  let dica: { texto: string; ok: boolean } | null = null;
  if (termos.porEstadia) dica = cheio ? { texto: t("Cartão completo: a visita é registrada, mas sem carimbo."), ok: false } : { texto: `Gera carimbo — fica ${cliente.carimbos + 1} de ${cliente.meta}.`, ok: true };
  else if (cheio) dica = { texto: t("Cartão completo: a visita é registrada, mas sem carimbo."), ok: false };
  else if (centavos === null)
    dica = valor ? { texto: "Digite só o valor. Ex.: 42,50", ok: false } : { texto: `Gasto mínimo para carimbo: ${formatarReais(gastoMinimo)}`, ok: true };
  else if (centavos < gastoMinimo) dica = { texto: `Abaixo do mínimo de ${formatarReais(gastoMinimo)}: será registrada sem carimbo.`, ok: false };
  else dica = { texto: `Gera carimbo — fica ${cliente.carimbos + 1} de ${cliente.meta}.`, ok: true };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setTentou(true);
        // pousada: 1 selo por estadia, sem valor (vai como R$ 0,00; o gasto mínimo é zero)
        if (termos.porEstadia) return aoRegistrar("0", comDescricao ? descricao : "");
        if (centavos === null) return;
        aoRegistrar(valor, comDescricao ? descricao : "");
      }}
      className="flex flex-col gap-4 rounded-2xl bg-white p-5"
    >
      <h2 className="font-display text-2xl text-restinga">{t("Registrar visita")}</h2>
      {termos.porEstadia ? (
        <p aria-live="polite" className="flex items-center gap-2 font-medium">
          {dica.ok ? <Check aria-hidden className="size-5 shrink-0 text-restinga" /> : <AlertTriangle aria-hidden className="size-5 shrink-0 text-sol" />}
          {dica.texto}
        </p>
      ) : (
      <div className="flex flex-col gap-2">
        <label htmlFor="valor" className="font-semibold text-restinga">
          Valor gasto
        </label>
        <div className="flex items-center rounded-2xl border-2 border-restinga/30 bg-white focus-within:border-restinga">
          <span aria-hidden className="pl-5 text-2xl text-carvao/70">R$</span>
          <input
            id="valor"
            value={valor}
            onChange={(e) => setValor(e.target.value.replace(/[^\d.,]/g, ""))}
            inputMode="decimal"
            autoComplete="off"
            autoFocus={focar}
            enterKeyHint="done"
            placeholder="0,00"
            aria-invalid={tentou && centavos === null}
            aria-describedby="dica-valor"
            className="min-h-16 w-full rounded-2xl bg-transparent px-3 text-4xl tabular-nums focus:outline-none"
          />
        </div>
        <p id="dica-valor" aria-live="polite" className="flex items-center gap-2 font-medium">
          {dica.ok ? <Check aria-hidden className="size-5 shrink-0 text-restinga" /> : <AlertTriangle aria-hidden className="size-5 shrink-0 text-sol" />}
          {dica.texto}
        </p>
      </div>
      )}

      {comDescricao ? (
        <div className="flex flex-col gap-2">
          <label htmlFor="descricao" className="font-semibold text-restinga">
            {termos.descricao} <span className="font-normal text-carvao/80">(opcional)</span>
          </label>
          <input
            id="descricao"
            value={descricao}
            maxLength={200}
            onChange={(e) => setDescricao(e.target.value)}
            className="min-h-12 rounded-xl border-2 border-restinga/30 px-4 text-lg"
          />
        </div>
      ) : (
        <button type="button" onClick={() => setComDescricao(true)} className="min-h-11 self-start font-semibold text-restinga underline underline-offset-4">
          + Adicionar descrição
        </button>
      )}

      <Botao type="submit" grande disabled={pendente} className={cheio ? "!bg-white border-2 border-restinga" : ""}>
        {pendente ? "Registrando…" : t("Registrar visita")}
      </Botao>
    </form>
  );
}

function AjusteManual({
  cliente,
  pendente,
  aoAjustar,
}: {
  cliente: Cliente;
  pendente: boolean;
  aoAjustar: (delta: 1 | -1, motivo: string) => void;
}) {
  const [motivo, setMotivo] = useState("");
  return (
    <section aria-labelledby="titulo-ajuste" className="flex flex-col gap-3 rounded-2xl bg-white p-5">
      <h2 id="titulo-ajuste" className="font-semibold text-restinga">
        Ajustar carimbos à mão
      </h2>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          aria-label="Motivo do ajuste (opcional)"
          placeholder="Motivo (opcional)"
          value={motivo}
          maxLength={200}
          onChange={(e) => setMotivo(e.target.value)}
          className="min-h-12 flex-1 rounded-xl border-2 border-restinga/30 px-4"
        />
        <div className="flex gap-3">
          <Botao
            variante="secundario"
            disabled={pendente || cliente.carimbos <= 0}
            onClick={() => {
              aoAjustar(-1, motivo);
              setMotivo("");
            }}
            className="flex-1"
            aria-label="Remover 1 carimbo"
          >
            <Minus aria-hidden className="size-5" /> 1
          </Botao>
          <Botao
            variante="secundario"
            disabled={pendente || cliente.carimbos >= cliente.meta}
            onClick={() => {
              aoAjustar(1, motivo);
              setMotivo("");
            }}
            className="flex-1"
            aria-label="Adicionar 1 carimbo"
          >
            <Plus aria-hidden className="size-5" /> 1
          </Botao>
        </div>
      </div>
    </section>
  );
}

function Dialogo({ aberto, aoFechar, titulo, children }: { aberto: boolean; aoFechar: () => void; titulo: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (aberto && !d.open) d.showModal();
    if (!aberto && d.open) d.close();
  }, [aberto]);
  return (
    <dialog
      ref={ref}
      onClose={aoFechar}
      aria-label={titulo}
      className="m-auto w-[min(92vw,28rem)] rounded-3xl bg-areia p-6 text-carvao backdrop:bg-carvao/60"
    >
      <h2 className="font-display text-3xl text-restinga">{titulo}</h2>
      <div className="mt-3 flex flex-col gap-4">{children}</div>
    </dialog>
  );
}

function Resgatar({ cliente, pendente, aoResgatar }: { cliente: Cliente; pendente: boolean; aoResgatar: () => void }) {
  const [aberto, setAberto] = useState(false);
  return (
    <section className="flex flex-col gap-3 rounded-2xl border-4 border-lima bg-white p-5">
      <p className="flex items-center gap-3 font-display text-2xl text-restinga">
        <Gift aria-hidden className="size-8 shrink-0" />
        Recompensa disponível — resgatar agora
      </p>
      <p className="text-lg">
        {cliente.nome.split(" ")[0]} ganhou: <strong>{cliente.recompensa}</strong>
      </p>
      <Botao grande onClick={() => setAberto(true)} disabled={pendente}>
        Resgatar
      </Botao>
      <Dialogo aberto={aberto} aoFechar={() => setAberto(false)} titulo="Confirmar resgate">
        <p className="text-lg">
          Entregou <strong>{cliente.recompensa}</strong> para {cliente.nome}? O cartão volta a 0 e começa um novo ciclo.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row-reverse">
          <Botao
            grande
            className="flex-1"
            disabled={pendente}
            onClick={() => {
              setAberto(false);
              aoResgatar();
            }}
          >
            Sim, resgatar
          </Botao>
          <Botao variante="secundario" grande className="flex-1" onClick={() => setAberto(false)}>
            Cancelar
          </Botao>
        </div>
      </Dialogo>
    </section>
  );
}

function TrocarPlano({
  cliente,
  planos,
  pendente,
  aoTrocar,
}: {
  cliente: Cliente;
  planos: { tipo: string; carimbos_meta: number; recompensa_texto: string }[];
  pendente: boolean;
  aoTrocar: (p: Plano) => void;
}) {
  const { t } = useTermos();
  const [aberto, setAberto] = useState(false);
  const outro = planos.find((p) => p.tipo !== cliente.plano);
  return (
    <>
      <span className="font-semibold">{t(NOME_PLANO[cliente.plano])}</span>
      {outro ? (
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="min-h-11 rounded-lg px-1 text-base font-semibold text-restinga underline underline-offset-4"
        >
          trocar
        </button>
      ) : null}
      {outro ? (
        <Dialogo aberto={aberto} aoFechar={() => setAberto(false)} titulo={`Trocar para ${t(NOME_PLANO[outro.tipo as Plano])}?`}>
          <ul className="list-disc pl-6 text-lg">
            <li>
              Nova regra: {outro.carimbos_meta} carimbos = {outro.recompensa_texto}.
            </li>
            <li>
              Carimbos: {Math.min(cliente.carimbos, cliente.meta)} → {Math.min(cliente.carimbos, outro.carimbos_meta)}
              {cliente.carimbos > outro.carimbos_meta ? " (máximo do novo plano)" : ""}.
            </li>
            {Math.min(cliente.carimbos, outro.carimbos_meta) >= outro.carimbos_meta ? <li>A recompensa ficará disponível.</li> : null}
          </ul>
          <div className="flex flex-col gap-3 sm:flex-row-reverse">
            <Botao
              grande
              className="flex-1"
              disabled={pendente}
              onClick={() => {
                setAberto(false);
                aoTrocar(outro.tipo as Plano);
              }}
            >
              Trocar plano
            </Botao>
            <Botao variante="secundario" grande className="flex-1" onClick={() => setAberto(false)}>
              Cancelar
            </Botao>
          </div>
        </Dialogo>
      ) : null}
    </>
  );
}

function Historico({
  historico,
  gastoMinimo,
  pendente,
  aoEditar,
  aoRemover,
}: {
  historico: ItemHistorico[];
  gastoMinimo: number;
  pendente: boolean;
  aoEditar: (visitaId: string, valor: string, descricao: string, fechar: () => void) => void;
  aoRemover: (visitaId: string, fechar: () => void) => void;
}) {
  const { t, termos } = useTermos();
  const [editando, setEditando] = useState<string | null>(null);
  const [removendo, setRemovendo] = useState<Extract<ItemHistorico, { tipo: "visita" }> | null>(null);
  const [tudo, setTudo] = useState(false);
  const visiveis = tudo ? historico : historico.slice(0, 15);
  if (historico.length === 0) {
    return <p className="rounded-2xl bg-white p-5 text-carvao/80">{t("Nenhuma visita registrada ainda.")}</p>;
  }
  return (
    <section aria-labelledby="titulo-historico" className="flex flex-col gap-3">
      <h2 id="titulo-historico" className="font-display text-2xl text-restinga">
        Histórico
      </h2>
      <ol className="flex flex-col divide-y divide-carvao/10 rounded-2xl bg-white">
        {visiveis.map((item) => (
          <li key={`${item.tipo}-${item.id}`} className="flex flex-col gap-2 p-4">
            {item.tipo === "visita" ? (
              editando === item.id ? (
                <EditarVisita
                  item={item}
                  gastoMinimo={gastoMinimo}
                  pendente={pendente}
                  aoCancelar={() => setEditando(null)}
                  aoSalvar={(v, d) => aoEditar(item.id, v, d, () => setEditando(null))}
                />
              ) : (
                <div className={`flex items-start gap-3 ${item.desfeita_em ? "opacity-60" : ""}`}>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-baseline gap-x-2">
                      <span className={`text-lg font-semibold tabular-nums ${item.desfeita_em ? "line-through" : ""}`}>
                        {termos.porEstadia ? t("Visita") : formatarReais(item.valor_centavos)}
                      </span>
                      <span className="text-sm text-carvao/80">{formatarDiaHora(item.criado_em)}</span>
                    </p>
                    {item.descricao ? <p className="text-carvao/90">{item.descricao}</p> : null}
                    <p className="mt-1 flex flex-wrap gap-2 text-sm">
                      {item.desfeita_em ? (
                        <Etiqueta>removida</Etiqueta>
                      ) : item.gerou_carimbo ? (
                        <Etiqueta positiva>+1 carimbo</Etiqueta>
                      ) : (
                        <Etiqueta>sem carimbo</Etiqueta>
                      )}
                      {item.editado_em ? <Etiqueta>corrigida</Etiqueta> : null}
                    </p>
                  </div>
                  {!item.desfeita_em ? (
                    <div className="flex shrink-0 gap-1">
                      {termos.porEstadia ? null : (
                      <button
                        type="button"
                        onClick={() => setEditando(item.id)}
                        aria-label={t(`Corrigir visita de ${formatarReais(item.valor_centavos)}`)}
                        className="flex size-11 items-center justify-center rounded-xl text-restinga hover:bg-restinga/10"
                      >
                        <Pencil aria-hidden className="size-5" />
                      </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setRemovendo(item)}
                        aria-label={t(`Remover visita de ${termos.porEstadia ? formatarDiaHora(item.criado_em) : formatarReais(item.valor_centavos)}`)}
                        className="flex size-11 items-center justify-center rounded-xl text-restinga hover:bg-restinga/10"
                      >
                        <Trash2 aria-hidden className="size-5" />
                      </button>
                    </div>
                  ) : null}
                </div>
              )
            ) : (
              <LinhaEvento item={item} />
            )}
          </li>
        ))}
      </ol>
      <Dialogo aberto={removendo !== null} aoFechar={() => setRemovendo(null)} titulo={t("Remover esta visita?")}>
        {removendo ? (
          <div className="flex flex-col gap-4">
            <p className="text-lg">
              {termos.porEstadia ? (
                <>{t("Visita")} de {formatarDiaHora(removendo.criado_em)}.</>
              ) : (
                <>{t("Visita")} de <strong>{formatarReais(removendo.valor_centavos)}</strong> em {formatarDiaHora(removendo.criado_em)}.</>
              )}
            </p>
            <p className="text-carvao/80">
              Ela sai das métricas e fica riscada no histórico.
              {removendo.gerou_carimbo ? t(" O carimbo dessa visita também sai do cartão.") : ""}
            </p>
            <div className="flex flex-wrap gap-3">
              <Botao disabled={pendente} onClick={() => aoRemover(removendo.id, () => setRemovendo(null))}>
                {t("Remover visita")}
              </Botao>
              <Botao variante="secundario" onClick={() => setRemovendo(null)}>
                Cancelar
              </Botao>
            </div>
          </div>
        ) : null}
      </Dialogo>
      {visiveis.length < historico.length ? (
        <Botao variante="secundario" onClick={() => setTudo(true)}>
          Mostrar histórico completo ({historico.length})
        </Botao>
      ) : null}
    </section>
  );
}

function LinhaEvento({ item }: { item: Extract<ItemHistorico, { tipo: "evento" }> }) {
  const { t } = useTermos();
  const d = item.dados ?? {};
  let texto: string;
  switch (item.tipo_evento) {
    case "manual_mais":
      texto = "+1 carimbo à mão";
      break;
    case "manual_menos":
      texto = "−1 carimbo à mão";
      break;
    case "resgate":
      texto = `Recompensa resgatada: ${String(d.recompensa ?? "")}`;
      break;
    case "troca_plano":
      texto = `Plano trocado: ${t(NOME_PLANO[d.de as Plano])} → ${t(NOME_PLANO[d.para as Plano])}`;
      break;
    case "ajuste_edicao":
      texto = t("Visita corrigida") + `: ${formatarReais(Number(d.valor_antigo))} → ${formatarReais(Number(d.valor_novo))}`;
      if (item.delta) texto += item.delta > 0 ? " (+1 carimbo)" : " (−1 carimbo)";
      if (d.aviso === "resgate_posterior") texto += " (carimbo mantido: houve resgate depois)";
      break;
    case "desfazer":
      texto =
        item.motivo === "visita removida"
          ? t("Carimbo retirado (visita removida)")
          : `Desfeito (${item.delta > 0 ? "+" : "−"}${Math.abs(item.delta)} carimbo)`;
      break;
    default:
      texto = item.tipo_evento;
  }
  return (
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <p className={`font-semibold ${item.tipo_evento === "resgate" ? "text-restinga" : ""}`}>{texto}</p>
        <p className="text-sm text-carvao/80">
          {formatarDiaHora(item.criado_em)} · ficou com {item.saldo_apos}
          {item.motivo && item.motivo !== "visita removida" ? ` · ${item.motivo}` : ""}
        </p>
      </div>
    </div>
  );
}

function Etiqueta({ children, positiva }: { children: ReactNode; positiva?: boolean }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 font-semibold ${positiva ? "bg-lima text-carvao" : "bg-carvao/10 text-carvao"}`}>
      {children}
    </span>
  );
}

function EditarVisita({
  item,
  gastoMinimo,
  pendente,
  aoCancelar,
  aoSalvar,
}: {
  item: Extract<ItemHistorico, { tipo: "visita" }>;
  gastoMinimo: number;
  pendente: boolean;
  aoCancelar: () => void;
  aoSalvar: (valor: string, descricao: string) => void;
}) {
  const { t } = useTermos();
  const [valor, setValor] = useState((item.valor_centavos / 100).toFixed(2).replace(".", ","));
  const [descricao, setDescricao] = useState(item.descricao ?? "");
  const centavos = lerReais(valor);
  const cruza = centavos !== null && centavos >= gastoMinimo !== item.gerou_carimbo;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (centavos !== null) aoSalvar(valor, descricao);
      }}
      className="flex flex-col gap-3"
    >
      <p className="font-semibold text-restinga">{t("Corrigir visita de")} {formatarDiaHora(item.criado_em)}</p>
      <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold">Valor (R$)</span>
          <input
            value={valor}
            onChange={(e) => setValor(e.target.value.replace(/[^\d.,]/g, ""))}
            inputMode="decimal"
            autoFocus
            className="min-h-12 rounded-xl border-2 border-restinga/30 px-3 text-lg tabular-nums"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold">Descrição</span>
          <input value={descricao} maxLength={200} onChange={(e) => setDescricao(e.target.value)} className="min-h-12 rounded-xl border-2 border-restinga/30 px-3" />
        </label>
      </div>
      {cruza ? (
        <p className="flex items-center gap-2 text-sm font-medium">
          <AlertTriangle aria-hidden className="size-4 text-sol" />
          {t(item.gerou_carimbo ? "Com esse valor a visita perde o carimbo." : "Com esse valor a visita ganha carimbo.")}
        </p>
      ) : null}
      <div className="flex gap-3">
        <Botao type="submit" disabled={pendente || centavos === null}>
          Salvar correção
        </Botao>
        <Botao type="button" variante="secundario" onClick={aoCancelar}>
          Cancelar
        </Botao>
      </div>
    </form>
  );
}
