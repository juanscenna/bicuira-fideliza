// Validação dos dados de um estabelecimento (usada pelo /admin).

export const SLUGS_RESERVADOS = [
  "painel", "admin", "entrar", "sair", "api", "privacidade", "cartao", "static", "public",
  "auth", "favicon-ico", "robots-txt", "sitemap-xml", "manifest", "bicuira", "fideliza",
];

/** "Bar do Zé & Cia" → "bar-do-ze-cia" */
export function gerarSlug(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

export function validarSlug(slug: string): string | null {
  if (slug.length < 3) return "Use pelo menos 3 caracteres.";
  if (slug.length > 60) return "Use no máximo 60 caracteres.";
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return "Use só letras minúsculas, números e hífen (sem acento).";
  if (SLUGS_RESERVADOS.includes(slug)) return "Esse endereço é reservado pelo sistema.";
  return null;
}

export const corValida = (cor: string) => /^#[0-9A-Fa-f]{6}$/.test(cor);

export type PlanoForm = { ativo: boolean; carimbos_meta: number; recompensa_texto: string };

import { ehTipoNegocio, type TipoNegocio } from "./negocio";

export type DadosEstabelecimento = {
  nome: string;
  slug: string;
  tipo_negocio: TipoNegocio;
  gasto_minimo_centavos: number;
  /** null = sem limite (o cliente nunca vira inativo) */
  dias_inatividade: number | null;
  max_personalizadas_semana: number;
  contato_privacidade: string | null;
  ativo: boolean;
  cobranca_plano: string | null;
  cobranca_status: string | null;
  cobranca_vencimento: string | null;
  morador: PlanoForm;
  turista: PlanoForm;
};

export type ErrosForm = Partial<Record<string, string>>;

/** Confere todas as regras; devolve um erro por campo (vazio = tudo certo). */
export function validarEstabelecimento(d: DadosEstabelecimento): ErrosForm {
  const erros: ErrosForm = {};
  if (d.nome.trim().length < 2 || d.nome.trim().length > 80) erros.nome = "Informe um nome entre 2 e 80 caracteres.";
  const erroSlug = validarSlug(d.slug);
  if (erroSlug) erros.slug = erroSlug;
  if (!ehTipoNegocio(d.tipo_negocio)) erros.tipo_negocio = "Escolha restaurante, bar ou pousada.";
  if (!Number.isInteger(d.gasto_minimo_centavos) || d.gasto_minimo_centavos < 0)
    erros.gasto_minimo = "Informe um valor em reais, como 15,00.";
  if (d.dias_inatividade !== null && (!Number.isInteger(d.dias_inatividade) || d.dias_inatividade < 1 || d.dias_inatividade > 3650))
    erros.dias_inatividade = "Entre 1 e 3650 dias, ou marque sem limite.";
  if (!Number.isInteger(d.max_personalizadas_semana) || d.max_personalizadas_semana < 0 || d.max_personalizadas_semana > 14)
    erros.max_personalizadas_semana = "Entre 0 e 14 mensagens.";
  if (!d.morador.ativo && !d.turista.ativo) erros.planos = "Deixe pelo menos um plano ativo.";
  for (const tipo of ["morador", "turista"] as const) {
    const p = d[tipo];
    if (!Number.isInteger(p.carimbos_meta) || p.carimbos_meta < 1 || p.carimbos_meta > 30)
      erros[`${tipo}_meta`] = "Entre 1 e 30 carimbos.";
    const t = p.recompensa_texto.trim();
    if (t.length < 2 || t.length > 60) erros[`${tipo}_recompensa`] = "Descreva a recompensa (2 a 60 caracteres).";
  }
  return erros;
}
