import { Montserrat } from "next/font/google";

// Mesma fonte do site da pousada (sonhosdorosa.lovable.app)
export const fonteSonhos = Montserrat({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--fonte-sonhos" });

/** Cores tiradas do site da pousada (tokens do CSS deles, convertidos de oklch). */
export const SONHOS = {
  fundo: "#FDFAF4", // --background
  areia: "#F3EAD9", // --sand (faixas e blocos de destaque)
  cartao: "#FFFFFC", // --card
  borda: "#E4DDCF", // --border
  texto: "#2F2115", // --foreground
  suave: "#756657", // --muted-foreground
  sol: "#E46A00", // --primary
  mar: "#065DA0", // --ocean
};

/** Degradê do sol (--gradient-sun) e sombra suave (--shadow-soft) do site. */
export const GRADIENTE_SOL = "bg-[linear-gradient(135deg,#EF8600,#DF5200)]";
export const SOMBRA = "shadow-[0_18px_40px_-24px_rgba(94,70,48,0.35)]";
