"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, PartyPopper, X } from "lucide-react";
import { CartaoVisual } from "@/components/cartao/CartaoVisual";
import { supabaseNavegador } from "@/lib/supabase/navegador";
import { canalDoCartao, EVENTO_ATUALIZOU } from "@/lib/tempo-real";
import type { EstadoCartao } from "@/lib/cartao";
import type { EstabelecimentoPublico } from "@/lib/publico";

type Props = {
  token: string;
  slug: string;
  estab: Pick<EstabelecimentoPublico, "nome" | "logoUrl" | "cor_primaria" | "cor_secundaria">;
  inicial: EstadoCartao;
  qrSvg: string;
};

const CONSULTA_DE_SEGURANCA_MS = 30_000; // caso o tempo real caia

/** Cartão web que se atualiza sozinho quando o dono registra algo no painel. */
export function CartaoAoVivo({ token, slug, estab, inicial, qrSvg }: Props) {
  const [cartao, setCartao] = useState(inicial);
  const [carimboNovo, setCarimboNovo] = useState<number | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [mensagemFechada, setMensagemFechada] = useState<string | null>(null);
  const atual = useRef(inicial);

  useEffect(() => {
    try {
      setMensagemFechada(localStorage.getItem(`msg-fechada:${token}`));
    } catch {}
  }, [token]);

  useEffect(() => {
    let ativo = true;

    async function atualizar() {
      try {
        const r = await fetch(`/api/cartao/${token}?e=${encodeURIComponent(slug)}`, { cache: "no-store" });
        if (!r.ok || !ativo) return;
        const novo: EstadoCartao = await r.json();
        const antes = atual.current;
        if (novo.carimbos > antes.carimbos) {
          setCarimboNovo(novo.carimbos - 1);
          setAviso(novo.recompensaDisponivel ? "Cartão completo! Recompensa disponível." : "+1 carimbo!");
        } else if (antes.recompensaDisponivel && novo.carimbos === 0) {
          setCarimboNovo(null);
          setAviso("Recompensa resgatada. Novo cartão começando!");
        }
        atual.current = novo;
        setCartao(novo);
      } catch {}
    }

    const supabase = supabaseNavegador();
    let canal: ReturnType<typeof supabase.channel> | null = null;
    canalDoCartao(token).then((nome) => {
      if (!ativo) return;
      canal = supabase.channel(nome).on("broadcast", { event: EVENTO_ATUALIZOU }, atualizar).subscribe();
    });
    const intervalo = setInterval(atualizar, CONSULTA_DE_SEGURANCA_MS);
    const aoVoltar = () => document.visibilityState === "visible" && atualizar();
    document.addEventListener("visibilitychange", aoVoltar);

    return () => {
      ativo = false;
      clearInterval(intervalo);
      document.removeEventListener("visibilitychange", aoVoltar);
      if (canal) supabase.removeChannel(canal);
    };
  }, [token, slug]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 5000);
    return () => clearTimeout(t);
  }, [aviso]);

  const mostrarMensagem = cartao.mensagem && cartao.mensagemEm !== mensagemFechada;

  return (
    <div className="flex flex-col gap-4">
      {mostrarMensagem ? (
        <div role="status" className="flex items-start gap-3 rounded-2xl bg-neutral-900 p-4 text-white shadow-lg">
          <Bell aria-hidden className="mt-0.5 size-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{estab.nome}</p>
            <p className="text-base">{cartao.mensagem}</p>
          </div>
          <button
            type="button"
            aria-label="Fechar mensagem"
            className="-m-2 flex size-11 shrink-0 items-center justify-center"
            onClick={() => {
              setMensagemFechada(cartao.mensagemEm);
              try {
                localStorage.setItem(`msg-fechada:${token}`, cartao.mensagemEm ?? "");
              } catch {}
            }}
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>
      ) : null}

      <CartaoVisual
        estabelecimento={estab}
        cliente={{ nome: cartao.nome, codigo: cartao.codigo }}
        carimbos={cartao.carimbos}
        meta={cartao.meta}
        recompensa={cartao.recompensa}
        qrSvg={qrSvg}
        carimboNovo={carimboNovo}
      />

      <p aria-live="polite" className="sr-only">
        {aviso ?? ""}
      </p>
      {aviso ? (
        <div
          aria-hidden
          className="fixed inset-x-4 bottom-6 z-30 mx-auto flex max-w-sm items-center justify-center gap-2 rounded-2xl bg-neutral-900 px-5 py-4 text-lg font-bold text-white shadow-xl"
        >
          <PartyPopper className="size-6" /> {aviso}
        </div>
      ) : null}
    </div>
  );
}
