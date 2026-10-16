import "server-only";
import { cache } from "react";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { TEMAS, temaDo, type IdTema } from "@/temas/config";

export type PlanoPublico = { tipo: "morador" | "turista"; carimbos_meta: number; recompensa_texto: string };

export type EstabelecimentoPublico = {
  id: string;
  slug: string;
  nome: string;
  tema: IdTema;
  logoUrl: string | null;
  cor_primaria: string;
  cor_secundaria: string;
  ativo: boolean;
  gasto_minimo_centavos: number;
  contato_privacidade: string | null;
  versao_politica: number;
  planos: PlanoPublico[];
};

/** Dados públicos de um estabelecimento pelo endereço (só campos que podem aparecer na página). */
export const estabelecimentoPorSlug = cache(async (slug: string): Promise<EstabelecimentoPublico | null> => {
  if (!/^[a-z0-9-]{3,60}$/.test(slug)) return null;
  const { data } = await supabaseAdmin()
    .from("estabelecimentos")
    .select(
      "id, slug, nome, ativo, gasto_minimo_centavos, contato_privacidade, versao_politica, planos (tipo, ativo, carimbos_meta, recompensa_texto)",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return null;
  const planos = (data.planos as (PlanoPublico & { ativo: boolean })[])
    .filter((p) => p.ativo)
    .sort((a, b) => a.tipo.localeCompare(b.tipo))
    .map(({ tipo, carimbos_meta, recompensa_texto }) => ({ tipo, carimbos_meta, recompensa_texto }));
  return {
    id: data.id,
    slug: data.slug,
    nome: data.nome,
    // identidade visual vem do tema (código), não do admin
    tema: temaDo(data.slug),
    logoUrl: TEMAS[temaDo(data.slug)].logoUrl,
    cor_primaria: TEMAS[temaDo(data.slug)].cor_primaria,
    cor_secundaria: TEMAS[temaDo(data.slug)].cor_secundaria,
    ativo: data.ativo,
    gasto_minimo_centavos: data.gasto_minimo_centavos,
    contato_privacidade: data.contato_privacidade,
    versao_politica: data.versao_politica,
    planos,
  };
});
