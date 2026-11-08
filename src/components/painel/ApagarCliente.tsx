"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { apagarCliente } from "@/app/painel/acoes";
import { Dialogo } from "./FichaCliente";
import { useTermos } from "./Termos";

/**
 * Apagar o cliente de vez, no fim da ficha. Pede para digitar APAGAR (não dá para desfazer).
 * Depois volta para a lista de clientes, onde ele já não aparece.
 */
export function ApagarCliente({ clienteId, nome, codigo }: { clienteId: string; nome: string; codigo: string }) {
  const { t } = useTermos();
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const pronto = confirmacao.trim().toUpperCase() === "APAGAR";

  function fechar() {
    setAberto(false);
    setConfirmacao("");
    setErro(null);
  }

  function apagar() {
    iniciar(async () => {
      const r = await apagarCliente(clienteId, confirmacao);
      if (!r.ok) return setErro(r.erro);
      router.replace(`/painel/clientes?apagado=${encodeURIComponent(codigo)}`);
    });
  }

  return (
    <section aria-labelledby="titulo-apagar" className="flex flex-col gap-2 rounded-2xl border-2 border-carvao/15 bg-white p-5">
      <h2 id="titulo-apagar" className="text-lg font-bold text-carvao">
        Apagar cliente
      </h2>
      <p className="text-carvao/80">{t("Remove o cartão e todo o histórico deste cliente. Ele sai da lista e das métricas.")}</p>
      <Botao variante="secundario" className="self-start" onClick={() => setAberto(true)}>
        <Trash2 aria-hidden className="size-5" /> Apagar cliente
      </Botao>

      <Dialogo aberto={aberto} aoFechar={fechar} titulo="Apagar de vez?">
        <p className="text-lg">
          <strong>{nome}</strong> · cartão <strong className="font-mono">{codigo}</strong>
        </p>
        <p className="text-carvao/80">
          {t("O cartão para de funcionar e somem os carimbos, as visitas e o histórico. Não dá para desfazer.")}
        </p>
        <label htmlFor="confirmar-apagar" className="font-semibold">
          Para confirmar, digite APAGAR
        </label>
        <input
          id="confirmar-apagar"
          value={confirmacao}
          onChange={(e) => setConfirmacao(e.target.value)}
          autoComplete="off"
          autoCapitalize="characters"
          className="min-h-12 rounded-xl border-2 border-carvao/30 bg-white px-4 text-lg uppercase focus:border-restinga focus:outline-none"
          aria-invalid={Boolean(erro)}
          aria-describedby={erro ? "erro-apagar" : undefined}
        />
        {erro ? (
          <p id="erro-apagar" role="alert" className="font-medium text-carvao">
            {erro}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <Botao disabled={!pronto || pendente} onClick={apagar}>
            {pendente ? "Apagando…" : "Apagar de vez"}
          </Botao>
          <Botao variante="secundario" onClick={fechar} disabled={pendente}>
            Cancelar
          </Botao>
        </div>
      </Dialogo>
    </section>
  );
}
