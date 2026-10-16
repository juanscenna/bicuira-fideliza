import { Montserrat } from "next/font/google";

// Fonte geométrica bem pesada, parecida com a da logo
export const fonteRosa = Montserrat({ subsets: ["latin"], weight: ["500", "700", "800", "900"], variable: "--fonte-rosa" });

export const ROSA = {
  preto: "#0A0A0A",
  rosa: "#E8115A",
  amarelo: "#F2B315",
  creme: "#F3EEE5",
};
