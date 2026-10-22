import "server-only";
import { supabaseServidor } from "@/lib/supabase/servidor";
import { supabaseAdmin } from "@/lib/supabase/admin";
export { urlLogo } from "@/lib/logo";
import type { DadosEstabelecimento } from "@/lib/dominio/estabelecimento";

export type EstabelecimentoCompleto = DadosEstabelecimento & {
  id: string;
  logo_path: string | null;
};

/** Estabelecimento com os dois planos (lido com o login do super admin). */
export async function carregarEstabelecimento(id: string): Promise<EstabelecimentoCompleto | null> {
  const supabase = await supabaseServidor();
  const { data: e } = await supabase
    .from("estabelecimentos")
    .select("*, planos (tipo, ativo, carimbos_meta, recompensa_texto)")
    .eq("id", id)
    .maybeSingle();
  if (!e) return null;
  const plano = (tipo: string) => {
    const p = (e.planos as { tipo: string; ativo: boolean; carimbos_meta: number; recompensa_texto: string }[]).find(
      (x) => x.tipo === tipo,
    );
    return { ativo: p?.ativo ?? false, carimbos_meta: p?.carimbos_meta ?? 10, recompensa_texto: p?.recompensa_texto ?? "" };
  };
  return {
    id: e.id,
    nome: e.nome,
    slug: e.slug,
    tipo_negocio: e.tipo_negocio,
    logo_path: e.logo_path,
    gasto_minimo_centavos: e.gasto_minimo_centavos,
    dias_inatividade: e.dias_inatividade,
    max_personalizadas_semana: e.max_personalizadas_semana,
    contato_privacidade: e.contato_privacidade,
    ativo: e.ativo,
    cobranca_plano: e.cobranca_plano,
    cobranca_status: e.cobranca_status,
    cobranca_vencimento: e.cobranca_vencimento,
    morador: plano("morador"),
    turista: plano("turista"),
  };
}

/** Logins de dono ligados ao estabelecimento (e-mail vem do Auth, só no servidor). */
export async function donosDoEstabelecimento(estabelecimentoId: string) {
  const admin = supabaseAdmin();
  const { data: perfis } = await admin
    .from("perfis")
    .select("user_id")
    .eq("papel", "dono")
    .eq("estabelecimento_id", estabelecimentoId);
  const donos = await Promise.all(
    (perfis ?? []).map(async (p) => {
      const { data } = await admin.auth.admin.getUserById(p.user_id);
      return { userId: p.user_id, email: data.user?.email ?? "(sem e-mail)" };
    }),
  );
  return donos;
}
