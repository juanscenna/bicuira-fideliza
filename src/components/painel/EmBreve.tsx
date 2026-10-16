/** Espaço reservado para telas das próximas etapas do piloto. */
export function EmBreve({ titulo, etapa, descricao }: { titulo: string; etapa: number; descricao: string }) {
  return (
    <section className="flex flex-col gap-3">
      <h1 className="font-display text-4xl text-restinga">{titulo}</h1>
      <div className="rounded-2xl border-2 border-dashed border-restinga/30 bg-white/60 p-6">
        <p className="font-semibold text-restinga">Chega na etapa {etapa}</p>
        <p className="mt-1">{descricao}</p>
      </div>
    </section>
  );
}
