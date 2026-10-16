import Link from "next/link";
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
          gasto_minimo_centavos: 1500,
          dias_inatividade: 30,
          max_personalizadas_semana: 2,
          contato_privacidade: null,
          ativo: true,
          cobranca_plano: null,
          cobranca_status: null,
          cobranca_vencimento: null,
          morador: { ativo: true, carimbos_meta: 10, recompensa_texto: "1 prato" },
          turista: { ativo: true, carimbos_meta: 5, recompensa_texto: "1 sobremesa" },
        }}
      />
    </div>
  );
}
