import { Montserrat } from "next/font/google";

// Fonte geométrica bem pesada, parecida com a da logo
export const fonteSonhos = Montserrat({ subsets: ["latin"], weight: ["500", "700", "800", "900"], variable: "--fonte-sonhos" });

export const SONHOS = {
  preto: "#2F2115",
  azul: "#065DA0",
  amarelo: "#E46A00",
  creme: "#FDFAF4",
};
