"use client";

import { startTransition, useActionState, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { Campo } from "@/components/ui/Campo";
import { gerarSlug, type DadosEstabelecimento } from "@/lib/dominio/estabelecimento";
import type { EstadoForm } from "@/app/admin/acoes";

type Props = {
  acao: (anterior: EstadoForm, form: FormData) => Promise<EstadoForm>;
  inicial: DadosEstabelecimento;
  novo: boolean;
  urlBase: string;
};

function centavosParaTexto(c: number) {
  return (c / 100).toFixed(2).replace(".", ",");
}

export function FormEstabelecimento({ acao, inicial, novo, urlBase }: Props) {
  const [estado, enviar, enviando] = useActionState(acao, {});
  const erros = estado.erros ?? {};

  const [nome, setNome] = useState(inicial.nome);
  const [slug, setSlug] = useState(inicial.slug);
  const [slugEditado, setSlugEditado] = useState(!novo);
  const [morador, setMorador] = useState(inicial.morador);
  const [turista, setTurista] = useState(inicial.turista);

  return (
    <form
      // envio manual: evita que o React limpe os campos quando a validação devolve erros
      onSubmit={(e) => {
        e.preventDefault();
        const dados = new FormData(e.currentTarget);
        startTransition(() => enviar(dados));
      }}
      className="flex max-w-3xl flex-col gap-8"
    >
      <div className="flex flex-col gap-8">
        <Secao titulo="Informações básicas" descricao="O visual da página e do cartão é feito sob medida pela Bicuíra, fora deste formulário.">
          <Campo
            id="nome"
            name="nome"
            rotulo="Nome do estabelecimento"
            required
            value={nome}
            erro={erros.nome}
            onChange={(e) => {
              setNome(e.target.value);
              if (!slugEditado) setSlug(gerarSlug(e.target.value));
            }}
          />
          <Campo
            id="slug"
            name="slug"
            rotulo="Endereço da página"
            required
            value={slug}
            erro={erros.slug}
            ajuda={`${urlBase}/${slug || "…"}${novo ? "" : " · Mudar o endereço invalida os QR Codes já impressos."}`}
            onChange={(e) => {
              setSlugEditado(true);
              setSlug(e.target.value.toLowerCase());
            }}
            autoCapitalize="off"
            spellCheck={false}
          />
        </Secao>

        <Secao titulo="Planos e regras" descricao="O dono vê estas regras, mas não pode mudá-las.">
          {erros.planos ? <Aviso>{erros.planos}</Aviso> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <EditorPlano tipo="morador" titulo="Moradores" plano={morador} onChange={setMorador} erros={erros} />
            <EditorPlano tipo="turista" titulo="Turistas" plano={turista} onChange={setTurista} erros={erros} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Campo
              id="gasto_minimo"
              name="gasto_minimo"
              rotulo="Gasto mínimo por visita (R$)"
              inputMode="decimal"
              defaultValue={centavosParaTexto(inicial.gasto_minimo_centavos)}
              erro={erros.gasto_minimo}
            />
            <Campo
              id="dias_inatividade"
              name="dias_inatividade"
              rotulo="Inativo após (dias)"
              inputMode="numeric"
              defaultValue={inicial.dias_inatividade}
              erro={erros.dias_inatividade}
            />
            <Campo
              id="max_personalizadas_semana"
              name="max_personalizadas_semana"
              rotulo="Mensagens por cliente/semana"
              inputMode="numeric"
              defaultValue={inicial.max_personalizadas_semana}
              erro={erros.max_personalizadas_semana}
            />
          </div>
        </Secao>

        <Secao titulo="Privacidade (LGPD)">
          <Campo
            id="contato_privacidade"
            name="contato_privacidade"
            rotulo="Contato para pedidos de exclusão de dados"
            ajuda="E-mail ou telefone do estabelecimento. Aparece na política de privacidade."
            defaultValue={inicial.contato_privacidade ?? ""}
          />
        </Secao>

        <Secao titulo="Status e cobrança" descricao="A cobrança acontece fora do sistema; estes campos são só para controle.">
          <label className="flex min-h-12 items-center gap-3 rounded-xl bg-white px-4 font-semibold">
            <input type="checkbox" name="ativo" defaultChecked={inicial.ativo} className="size-5 accent-restinga" />
            Estabelecimento ativo (desligado: a página pública mostra um aviso e o painel fica pausado)
          </label>
          <div className="grid gap-4 sm:grid-cols-3">
            <Campo id="cobranca_plano" name="cobranca_plano" rotulo="Plano contratado" defaultValue={inicial.cobranca_plano ?? ""} />
            <Campo id="cobranca_status" name="cobranca_status" rotulo="Status do pagamento" defaultValue={inicial.cobranca_status ?? ""} />
            <Campo id="cobranca_vencimento" name="cobranca_vencimento" type="date" rotulo="Vencimento" defaultValue={inicial.cobranca_vencimento ?? ""} />
          </div>
        </Secao>

        <div className="sticky bottom-20 z-10 flex flex-col gap-3 rounded-2xl bg-areia/95 py-3 md:bottom-0">
          {estado.mensagem ? (
            <p role="status" className={`flex items-center gap-2 rounded-xl px-4 py-3 font-medium ${estado.ok ? "bg-lima" : "border-2 border-sol bg-white"}`}>
              {estado.ok ? <CheckCircle2 aria-hidden className="size-5 shrink-0" /> : <AlertTriangle aria-hidden className="size-5 shrink-0 text-sol" />}
              {estado.mensagem}
            </p>
          ) : null}
          <Botao type="submit" grande disabled={enviando}>
            {enviando ? "Salvando…" : novo ? "Criar estabelecimento" : "Salvar alterações"}
          </Botao>
        </div>
      </div>

    </form>
  );
}

function Secao({ titulo, descricao, children }: { titulo: string; descricao?: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="mb-1 font-display text-2xl text-restinga">{titulo}</legend>
      {descricao ? <p className="-mt-2 text-carvao/80">{descricao}</p> : null}
      {children}
    </fieldset>
  );
}

function Aviso({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-xl border-2 border-sol bg-white px-4 py-3 text-sm font-medium">
      <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-sol" />
      {children}
    </p>
  );
}

function EditorPlano({
  tipo,
  titulo,
  plano,
  onChange,
  erros,
}: {
  tipo: "morador" | "turista";
  titulo: string;
  plano: DadosEstabelecimento["morador"];
  onChange: (p: DadosEstabelecimento["morador"]) => void;
  erros: Partial<Record<string, string>>;
}) {
  return (
    <div className={`flex flex-col gap-3 rounded-2xl bg-white p-4 ${plano.ativo ? "" : "opacity-70"}`}>
      <label className="flex min-h-11 items-center gap-3 text-lg font-semibold">
        <input
          type="checkbox"
          name={`${tipo}_ativo`}
          checked={plano.ativo}
          onChange={(e) => onChange({ ...plano, ativo: e.target.checked })}
          className="size-5 accent-restinga"
        />
        {titulo}
      </label>
      <Campo
        id={`${tipo}_meta`}
        name={`${tipo}_meta`}
        rotulo="Carimbos para a recompensa"
        inputMode="numeric"
        value={Number.isNaN(plano.carimbos_meta) ? "" : String(plano.carimbos_meta)}
        onChange={(e) => onChange({ ...plano, carimbos_meta: e.target.value === "" ? NaN : Number(e.target.value.replace(/\D/g, "")) })}
        erro={erros[`${tipo}_meta`]}
      />
      <Campo
        id={`${tipo}_recompensa`}
        name={`${tipo}_recompensa`}
        rotulo="Recompensa"
        value={plano.recompensa_texto}
        maxLength={60}
        onChange={(e) => onChange({ ...plano, recompensa_texto: e.target.value })}
        erro={erros[`${tipo}_recompensa`]}
      />
    </div>
  );
}
