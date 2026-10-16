import { exigirSuperAdmin } from "@/lib/auth";
import { supabaseServidor } from "@/lib/supabase/servidor";

export default async function AdminInicio() {
  await exigirSuperAdmin();
  const supabase = await supabaseServidor();
  const { data: estabelecimentos } = await supabase
    .from("estabelecimentos")
    .select("id, nome, slug, ativo, clientes(count)")
    .order("nome");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-4xl text-restinga">Estabelecimentos</h1>
      <p className="rounded-2xl border-2 border-dashed border-restinga/30 bg-white/60 p-4">
        Criar e editar estabelecimentos, login do dono e QR Code chegam na etapa 2.
      </p>
      <ul className="flex flex-col gap-3">
        {(estabelecimentos ?? []).map((e) => {
          const total = (e.clientes as unknown as { count: number }[])[0]?.count ?? 0;
          return (
            <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-5">
              <div>
                <p className="text-lg font-semibold">{e.nome}</p>
                <p className="text-sm text-carvao/80">/{e.slug}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm">
                  {total} {total === 1 ? "cliente" : "clientes"}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-sm font-semibold ${
                    e.ativo ? "bg-lima text-carvao" : "bg-carvao/10 text-carvao"
                  }`}
                >
                  {e.ativo ? "Ativo" : "Inativo"}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
