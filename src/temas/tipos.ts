import type React from "react";
import type { ReactNode } from "react";

/** Dados do estabelecimento que o design de cada tema pode usar. */
export type EstabTema = { nome: string; logoUrl: string | null };

export type PropsMoldura = { estab: EstabTema; children: ReactNode };

export type PropsCartao = {
  estab: EstabTema;
  cliente: { nome: string; codigo: string };
  carimbos: number;
  meta: number;
  recompensa: string;
  /** SVG do QR Code (gerado no servidor) */
  qrSvg: string;
  /** índice (0-based) do carimbo recém-ganho, para animar */
  carimboNovo?: number | null;
};

/** Página de cadastro completa de um tema (opcional). Recebe o formulário pronto. */
export type PropsCadastro = { estab: EstabTema; formulario: React.ReactNode };

/** Página do cartão completa de um tema (opcional). Recebe as peças prontas. */
export type PropsPaginaCartao = {
  estab: EstabTema;
  primeiroNome: string;
  status: "novo" | "recuperado" | null;
  /** cartão ao vivo (já com tempo real) */
  cartao: React.ReactNode;
  /** botões do Wallet (se ligado) + "salvar na tela inicial" */
  guardar: React.ReactNode;
  regras: { codigo: string; gastoMinimo: string; meta: number | null; recompensa: string | null };
  privacidadeHref: string;
};
