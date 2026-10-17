import "server-only";
import { supabaseServidor } from "@/lib/supabase/servidor";

export type ClienteAdmin = {
  id: string;
  nome: string;
  telefone: string | null;
  codigo: string;
  plano: "morador" | "turista";
  carimbos: number;
  cadastroEm: string;
  ultimaVisitaEm: string | null;
  removido: boolean;
  visitas: number;
  gastoCentavos: number;
  resgates: number;
};

/** Busca tudo em páginas de 1000 (limite do Supabase por consulta). */
async function todas<T>(consulta: (de: number, ate: number) => PromiseLike<{ data: T[] | null }>) {
  const linhas: T[] = [];
  for (let de = 0; ; de += 1000) {
    const { data } = await consulta(de, de + 999);
    linhas.push(...(data ?? []));
    if (!data || data.length < 1000) return linhas;
  }
}

/** Clientes de um estabelecimento com visitas, gasto e resgates (só o super admin vê de todos, pelo RLS). */
export async function clientesDoEstabelecimento(estabId: string): Promise<ClienteAdmin[]> {
  const supabase = await supabaseServidor();
  const [clientes, visitas, resgates] = await Promise.all([
    todas((de, ate) =>
      supabase
        .from("clientes")
        .select("id, nome, telefone, codigo, plano_tipo, carimbos_atuais, criado_em, ultima_visita_em, anonimizado_em")
        .eq("estabelecimento_id", estabId)
        .order("criado_em")
        .range(de, ate),
    ),
    todas((de, ate) =>
      supabase.from("visitas").select("cliente_id, valor_centavos").eq("estabelecimento_id", estabId).is("desfeita_em", null).order("id").range(de, ate),
    ),
    todas((de, ate) =>
      supabase.from("eventos_carimbo").select("cliente_id").eq("estabelecimento_id", estabId).eq("tipo", "resgate").order("id").range(de, ate),
    ),
  ]);

  const soma = new Map<string, { visitas: number; gasto: number; resgates: number }>();
  const de = (id: string) => soma.get(id) ?? (soma.set(id, { visitas: 0, gasto: 0, resgates: 0 }), soma.get(id)!);
  for (const v of visitas) {
    const s = de(v.cliente_id);
    s.visitas++;
    s.gasto += v.valor_centavos;
  }
  for (const r of resgates) de(r.cliente_id).resgates++;

  return clientes.map((c) => {
    const s = soma.get(c.id) ?? { visitas: 0, gasto: 0, resgates: 0 };
    return {
      id: c.id,
      nome: c.anonimizado_em ? "Cliente removido" : c.nome,
      telefone: c.anonimizado_em ? null : c.telefone,
      codigo: c.codigo,
      plano: c.plano_tipo as ClienteAdmin["plano"],
      carimbos: c.carimbos_atuais,
      cadastroEm: c.criado_em,
      ultimaVisitaEm: c.ultima_visita_em,
      removido: Boolean(c.anonimizado_em),
      visitas: s.visitas,
      gastoCentavos: s.gasto,
      resgates: s.resgates,
    };
  });
}
