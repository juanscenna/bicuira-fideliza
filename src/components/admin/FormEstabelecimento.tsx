"use client";

import { startTransition, useActionState, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { Campo } from "@/components/ui/Campo";
import { CartaoVisual } from "@/components/cartao/CartaoVisual";
import { gerarSlug, type DadosEstabelecimento } from "@/lib/dominio/estabelecimento";
import { avaliarCor } from "@/lib/tema";
import type { EstadoForm } from "@/app/admin/acoes";

type Props = {
  acao: (anterior: EstadoForm, form: FormData) => Promise<EstadoForm>;
  inicial: DadosEstabelecimento;
  logoUrl: string | null;
  novo: boolean;
  qrExemplo: string;
  urlBase: string;
};

function centavosParaTexto(c: number) {
  return (c / 100).toFixed(2).replace(".", ",");
}

export function FormEstabelecimento({ acao, inicial, logoUrl, novo, qrExemplo, urlBase }: Props) {
  const [estado, enviar, enviando] = useActionState(acao, {});
  const erros = estado.erros ?? {};

  const [nome, setNome] = useState(inicial.nome);
  const [slug, setSlug] = useState(inicial.slug);
  const [slugEditado, setSlugEditado] = useState(!novo);
  const [primaria, setPrimaria] = useState(inicial.cor_primaria);
  const [secundaria, setSecundaria] = useState(inicial.cor_secundaria);
  const [previaLogo, setPreviaLogo] = useState<string | null>(logoUrl);
  const [morador, setMorador] = useState(inicial.morador);
  const [turista, setTurista] = useState(inicial.turista);

  const planoPrevia = morador.ativo ? morador : turista;

  return (
    <form
      // envio manual: evita que o React limpe os campos quando a validação devolve erros
      onSubmit={(e) => {
        e.preventDefault();
        const dados = new FormData(e.currentTarget);
        startTransition(() => enviar(dados));
      }}
      className="grid gap-8 lg:grid-cols-[1fr_340px]"
    >
      <div className="flex flex-col gap-8">
        <Secao titulo="Identidade">
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
          <div className="flex flex-col gap-1.5">
            <label htmlFor="logo" className="font-semibold text-restinga">
              Logo <span className="font-normal text-carvao/80">(PNG, JPG ou WebP, até 2 MB, de preferência quadrada)</span>
            </label>
            <input
              id="logo"
              name="logo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="min-h-12 rounded-xl border-2 border-dashed border-restinga/30 bg-white p-3 file:mr-4 file:rounded-lg file:border-0 file:bg-restinga file:px-4 file:py-2 file:font-semibold file:text-areia"
              onChange={(e) => {
                const f = e.target.files?.[0];
                setPreviaLogo(f ? URL.createObjectURL(f) : logoUrl);
              }}
            />
            {erros.logo ? <p className="text-sm font-medium">{erros.logo}</p> : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <SeletorCor id="cor_primaria" rotulo="Cor principal (fundo do cartão)" valor={primaria} onChange={setPrimaria} erro={erros.cor_primaria} />
            <SeletorCor id="cor_secundaria" rotulo="Cor secundária (faixa de carimbos)" valor={secundaria} onChange={setSecundaria} erro={erros.cor_secundaria} />
          </div>
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

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <p className="mb-3 font-semibold text-restinga">Prévia do cartão</p>
        <CartaoVisual
          estabelecimento={{ nome: nome || "Nome do estabelecimento", logoUrl: previaLogo, cor_primaria: primaria, cor_secundaria: secundaria }}
          cliente={{ nome: "Maria Exemplo", codigo: "K4827" }}
          carimbos={Math.min(3, planoPrevia.carimbos_meta || 1)}
          meta={Math.max(1, Math.min(planoPrevia.carimbos_meta || 1, 30))}
          recompensa={planoPrevia.recompensa_texto || "recompensa"}
          qrSvg={qrExemplo}
        />
      </aside>
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

function SeletorCor({ id, rotulo, valor, onChange, erro }: { id: string; rotulo: string; valor: string; onChange: (v: string) => void; erro?: string }) {
  const avaliacao = /^#[0-9A-Fa-f]{6}$/.test(valor) ? avaliarCor(valor) : null;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-semibold text-restinga">
        {rotulo}
      </label>
      <div className="flex gap-2">
        <input
          type="color"
          aria-label={`${rotulo}: escolher`}
          value={avaliacao ? valor : "#000000"}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-12 w-14 shrink-0 cursor-pointer rounded-xl border-2 border-restinga/25 bg-white p-1"
        />
        <input
          id={id}
          name={id}
          value={valor}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          maxLength={7}
          spellCheck={false}
          className="min-h-12 w-full rounded-xl border-2 border-restinga/25 bg-white px-4 font-mono text-lg uppercase"
        />
      </div>
      {erro ? <p className="text-sm font-medium">{erro}</p> : null}
      {avaliacao && !avaliacao.textoPequenoOk ? (
        <Aviso>
          Contraste baixo ({avaliacao.razao.toFixed(1)}:1): textos pequenos sobre esta cor ficam difíceis de ler. Prefira um tom mais escuro ou
          mais claro.
        </Aviso>
      ) : null}
    </div>
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
