import type { ComponentType } from "react";
import type { IdTema } from "./config";
import type { PropsPaginaCartao } from "./tipos";
import { PaginaCartaoRosaNorte } from "./rosa-norte/PaginaCartao";
import { PaginaCartaoSonhosDoRosa } from "./sonhos-do-rosa/PaginaCartao";

/** Temas com página do cartão própria (os outros usam a Moldura). */
export const PAGINAS_CARTAO: Partial<Record<IdTema, ComponentType<PropsPaginaCartao>>> = {
  "rosa-norte": PaginaCartaoRosaNorte,
  "sonhos-do-rosa": PaginaCartaoSonhosDoRosa,
};
