/** Selo do cartão = logo do restaurante. Ganho: logo colorida; ainda não: logo apagada. */
export function Selo({ feito }: { feito: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/temas/rosa-norte/logo-256.png"
      alt=""
      aria-hidden
      draggable={false}
      className={`size-full rounded-full object-cover transition-[filter,opacity] duration-300 ${feito ? "" : "opacity-20 grayscale"}`}
    />
  );
}
