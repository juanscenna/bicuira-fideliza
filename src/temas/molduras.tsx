import type { ComponentType } from "react";
import type { IdTema } from "./config";
import type { PropsMoldura } from "./tipos";
import { MolduraBasico } from "./basico/Moldura";
import { MolduraRosaNorte } from "./rosa-norte/Moldura";
import { MolduraSonhosDoRosa } from "./sonhos-do-rosa/Moldura";

export const MOLDURAS: Record<IdTema, ComponentType<PropsMoldura>> = {
  basico: MolduraBasico,
  "rosa-norte": MolduraRosaNorte,
  "sonhos-do-rosa": MolduraSonhosDoRosa,
};
