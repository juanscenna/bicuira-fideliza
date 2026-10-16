import type { ButtonHTMLAttributes } from "react";

type Variante = "principal" | "secundario" | "texto";

const estilos: Record<Variante, string> = {
  // Lima com texto carvão: 8,1:1 de contraste
  principal: "bg-lima text-carvao hover:brightness-95 active:brightness-90",
  secundario: "border-2 border-restinga text-restinga bg-transparent hover:bg-restinga/5",
  texto: "text-restinga underline-offset-4 hover:underline",
};

export function classesBotao(variante: Variante = "principal", grande = false) {
  return [
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition",
    "disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
    grande ? "min-h-14 px-6 text-lg" : "min-h-12 px-5",
    estilos[variante],
  ].join(" ");
}

export function Botao({
  variante = "principal",
  grande = false,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; grande?: boolean }) {
  return <button className={`${classesBotao(variante, grande)} ${className}`} {...props} />;
}
