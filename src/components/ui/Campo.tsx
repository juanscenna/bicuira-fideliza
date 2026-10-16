import type { InputHTMLAttributes } from "react";

/** Campo com rótulo visível e erro logo abaixo. */
export function Campo({
  rotulo,
  erro,
  ajuda,
  id,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { rotulo: string; erro?: string; ajuda?: string; id: string }) {
  const descricao = erro ? `${id}-erro` : ajuda ? `${id}-ajuda` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-semibold text-restinga">
        {rotulo}
      </label>
      <input
        id={id}
        aria-invalid={erro ? true : undefined}
        aria-describedby={descricao}
        className={`min-h-12 rounded-xl border-2 bg-white px-4 text-lg text-carvao placeholder:text-carvao/50 ${
          erro ? "border-sol" : "border-restinga/25 focus:border-restinga"
        } ${className}`}
        {...props}
      />
      {erro ? (
        <p id={`${id}-erro`} className="text-sm font-medium text-carvao" role="alert">
          <span aria-hidden className="mr-1 text-sol">●</span>
          {erro}
        </p>
      ) : ajuda ? (
        <p id={`${id}-ajuda`} className="text-sm text-carvao/75">
          {ajuda}
        </p>
      ) : null}
    </div>
  );
}
