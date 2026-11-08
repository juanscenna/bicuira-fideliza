import type React from "react";
import type { ReactNode } from "react";

/** Dados do estabelecimento que o design de cada tema pode usar. */
/** `porEstadia`: pousada (recepção, hospedagem) — os textos do cartão seguem o tipo de negócio. */
export type EstabTema = { nome: string; logoUrl: string | null; porEstadia?: boolean };

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
export type PropsCadastro = {
  estab: EstabTema;
  formulario: React.ReactNode;
  /** "Já tenho cartão" (abrir pelo celular) e a abertura automática do cartão guardado no aparelho */
  jaTenho: React.ReactNode;
};

/** Página do cartão completa de um tema (opcional). Recebe as peças prontas. */
export type PropsPaginaCartao = {
  estab: EstabTema;
  primeiroNome: string;
  status: "novo" | "recuperado" | null;
  /** cartão ao vivo (já com tempo real) */
  cartao: React.ReactNode;
  /**
   * OBRIGATÓRIO em todo tema: botões "Adicionar ao Google/Apple Wallet" (null quando o Wallet está desligado).
   * Regra: com `status` (cartão recém-criado ou recuperado) fica ACIMA do cartão; nas outras visitas, logo ABAIXO.
   * Nunca no fim da página.
   */
  wallet: React.ReactNode;
  /** avisos, novidades, "salvar na tela inicial" e "seus dados" */
  guardar: React.ReactNode;
  regras: { codigo: string; gastoMinimo: string; meta: number | null; recompensa: string | null };
  privacidadeHref: string;
  /** "Não é o seu cartão? Criar outro" */
  outroCartaoHref: string;
};
