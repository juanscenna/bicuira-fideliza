/**
 * Selo do cartão = logo da pousada (sem alteração) sobre um disco creme. Ainda não ganho: versão cinza.
 * A versão cinza é um arquivo pronto (sem `filter` CSS), mais leve para celulares antigos.
 */
export function Selo({ feito }: { feito: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={feito ? "/temas/sonhos-do-rosa/selo.webp" : "/temas/sonhos-do-rosa/selo-cinza.webp"}
      alt=""
      aria-hidden
      draggable={false}
      decoding="async"
      className={`size-full rounded-full object-cover ${feito ? "" : "opacity-40"}`}
    />
  );
}
