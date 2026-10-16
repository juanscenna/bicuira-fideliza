"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ScanLine } from "lucide-react";
import { buscarPorCodigo } from "@/app/painel/acoes";
import { LeitorQR } from "./LeitorQR";

const CODIGO_COMPLETO = /^[A-HJKMNP-Z]\d{4}$/;

/** Campo grande do código + leitor de QR. Com 5 caracteres válidos, abre a ficha sozinho. */
export function BuscaCodigo() {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [lendo, setLendo] = useState(false);
  const [buscando, iniciar] = useTransition();
  const campo = useRef<HTMLInputElement>(null);

  // No computador do caixa o cursor já começa no campo; no celular não (o teclado esconderia o botão do QR).
  useEffect(() => {
    if (window.matchMedia("(pointer: fine)").matches) campo.current?.focus();
  }, []);

  const abrir = useCallback(
    (valor: string) => {
      setErro(null);
      iniciar(async () => {
        const r = await buscarPorCodigo(valor);
        if ("id" in r) router.push(`/painel/clientes/${r.id}?registrar=1`);
        else setErro(r.erro);
      });
    },
    [router],
  );

  const aoLer = useCallback(
    (c: string) => {
      setLendo(false);
      setCodigo(c);
      abrir(c);
    },
    [abrir],
  );

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          abrir(codigo);
        }}
        className="flex flex-col gap-2"
      >
        <label htmlFor="codigo" className="font-semibold text-restinga">
          Código do cartão
        </label>
        <div className="flex gap-2">
          <input
            id="codigo"
            value={codigo}
            onChange={(e) => {
              // aceita minúsculas; troca O por 0, I/L por 1 (o código não usa essas letras depois da 1ª)
              const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
              const corrigido = v.slice(0, 1) + v.slice(1).replace(/O/g, "0").replace(/[IL]/g, "1");
              setCodigo(corrigido);
              setErro(null);
              if (CODIGO_COMPLETO.test(corrigido)) abrir(corrigido);
            }}
            ref={campo}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            enterKeyHint="go"
            placeholder="K4827"
            aria-invalid={!!erro}
            aria-describedby={erro ? "erro-codigo" : undefined}
            className="min-h-16 w-full min-w-0 rounded-2xl border-2 border-restinga/30 bg-white px-5 font-mono text-4xl tracking-[0.2em] uppercase placeholder:text-carvao/25 focus:border-restinga"
          />
          <button
            type="submit"
            disabled={buscando || codigo.length === 0}
            aria-label="Abrir cartão"
            className="flex min-h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-restinga text-areia disabled:opacity-40"
          >
            <ArrowRight aria-hidden className="size-7" />
          </button>
        </div>
        {erro ? (
          <p id="erro-codigo" role="alert" className="font-medium">
            <span aria-hidden className="mr-1 text-sol">●</span>
            {erro}
          </p>
        ) : buscando ? (
          <p className="text-carvao/80">Abrindo…</p>
        ) : null}
      </form>

      <button
        type="button"
        onClick={() => setLendo(true)}
        className="flex min-h-16 items-center justify-center gap-3 rounded-2xl bg-lima px-6 text-xl font-semibold text-carvao"
      >
        <ScanLine aria-hidden className="size-7" />
        Escanear QR Code
      </button>

      {lendo ? <LeitorQR aoLer={aoLer} aoFechar={() => setLendo(false)} /> : null}
    </div>
  );
}
