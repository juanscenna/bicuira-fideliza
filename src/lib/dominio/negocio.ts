// Tipo de negócio: define a configuração inicial e o vocabulário do painel.
// Restaurante e bar dão selo por gasto mínimo; pousada dá selo por estadia (valor opcional).
import type { DadosEstabelecimento } from "./estabelecimento";

export type TipoNegocio = "restaurante" | "bar" | "pousada";

export const TIPOS_NEGOCIO: Record<TipoNegocio, string> = {
  restaurante: "Restaurante",
  bar: "Bar",
  pousada: "Pousada",
};

export const ehTipoNegocio = (v: unknown): v is TipoNegocio => typeof v === "string" && v in TIPOS_NEGOCIO;

/** Pousada: 1 selo por estadia, sem gasto mínimo (o valor é opcional, só para métricas). */
export const selaPorEstadia = (tipo: TipoNegocio) => tipo === "pousada";

type Padrao = Pick<DadosEstabelecimento, "gasto_minimo_centavos" | "dias_inatividade" | "morador" | "turista">;

/** Configuração inicial ao criar um estabelecimento de cada tipo (tudo pode ser ajustado depois). */
export const PADRAO_POR_NEGOCIO: Record<TipoNegocio, Padrao> = {
  restaurante: {
    gasto_minimo_centavos: 1500,
    dias_inatividade: 30,
    morador: { ativo: true, carimbos_meta: 10, recompensa_texto: "1 prato" },
    turista: { ativo: true, carimbos_meta: 5, recompensa_texto: "1 sobremesa" },
  },
  bar: {
    gasto_minimo_centavos: 2000,
    dias_inatividade: 30,
    morador: { ativo: true, carimbos_meta: 10, recompensa_texto: "1 porção" },
    turista: { ativo: true, carimbos_meta: 5, recompensa_texto: "1 drink" },
  },
  pousada: {
    gasto_minimo_centavos: 0,
    dias_inatividade: null,
    morador: { ativo: false, carimbos_meta: 3, recompensa_texto: "1 café da manhã" },
    turista: { ativo: true, carimbos_meta: 3, recompensa_texto: "1 café da manhã" },
  },
};
