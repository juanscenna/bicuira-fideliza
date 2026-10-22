import Link from "next/link";
import { PADRAO_POR_NEGOCIO } from "@/lib/dominio/negocio";
import { ChevronLeft } from "lucide-react";
import { exigirSuperAdmin } from "@/lib/auth";
import { FormEstabelecimento } from "@/components/admin/FormEstabelecimento";
import { salvarEstabelecimento } from "@/app/admin/acoes";
import { SITE_URL } from "@/lib/env";

export default async function NovoEstabelecimento() {
  await exigirSuperAdmin();
  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin" className="flex min-h-11 items-center gap-1 self-start font-semibold text-restinga">
        <ChevronLeft aria-hidden className="size-5" /> Estabelecimentos
      </Link>
      <h1 className="font-display text-4xl text-restinga">Novo estabelecimento</h1>
      <FormEstabelecimento
        acao={salvarEstabelecimento.bind(null, null)}
        novo
        urlBase={SITE_URL}
        inicial={{
          nome: "",
          slug: "",
          tipo_negocio: "restaurante",
          ...PADRAO_POR_NEGOCIO.restaurante,
          max_personalizadas_semana: 2,
          contato_privacidade: null,
          ativo: true,
          cobranca_plano: null,
          cobranca_status: null,
          cobranca_vencimento: null,
        }}
      />
    </div>
  );
}
