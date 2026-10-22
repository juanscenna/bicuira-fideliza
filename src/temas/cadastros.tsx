import type { ComponentType } from "react";
import type { IdTema } from "./config";
import type { PropsCadastro } from "./tipos";
import { CadastroRosaNorte } from "./rosa-norte/Cadastro";
import { CadastroSonhosDoRosa } from "./sonhos-do-rosa/Cadastro";

/** Temas com página de cadastro própria (os outros usam a Moldura + formulário). */
export const CADASTROS: Partial<Record<IdTema, ComponentType<PropsCadastro>>> = {
  "rosa-norte": CadastroRosaNorte,
  "sonhos-do-rosa": CadastroSonhosDoRosa,
};
