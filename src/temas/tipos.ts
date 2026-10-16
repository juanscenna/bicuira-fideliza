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
