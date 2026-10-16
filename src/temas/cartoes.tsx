import type { ComponentType } from "react";
import type { IdTema } from "./config";
import type { PropsCartao } from "./tipos";
import { CartaoBasico } from "./basico/Cartao";
import { CartaoRosaNorte } from "./rosa-norte/Cartao";

/** Usado também no navegador (cartão em tempo real): só componentes sem código de servidor. */
export const CARTOES: Record<IdTema, ComponentType<PropsCartao>> = {
  basico: CartaoBasico,
  "rosa-norte": CartaoRosaNorte,
};
