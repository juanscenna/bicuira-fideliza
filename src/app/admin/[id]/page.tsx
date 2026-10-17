import Link from "next/link";
import { notFound } from "next/navigation";
import { BarChart3, ChevronLeft, Download, ExternalLink } from "lucide-react";
import { exigirSuperAdmin } from "@/lib/auth";
import { carregarEstabelecimento, donosDoEstabelecimento } from "@/lib/admin/dados";
import { temaDo } from "@/temas/config";
import { anonimizarCliente, criarLoginDono, redefinirSenhaDono, salvarEstabelecimento } from "@/app/admin/acoes";
import { FormEstabelecimento } from "@/components/admin/FormEstabelecimento";
import { FormAnonimizar, FormCriarDono, FormRedefinirSenha } from "@/components/admin/Secoes";
import { classesBotao } from "@/components/ui/Botao";
import { qrSvg } from "@/lib/qr";
import { SITE_URL } from "@/lib/env";

export default async function EditarEstabelecimento({ params, searchParams }: PageProps<"/admin/[id]">) {
  await exigirSuperAdmin();
  const { id } = await params;
  const { criado, dono } = await searchParams;
  const estab = await carregarEstabelecimento(id);
  if (!estab) notFound();

  const [donos, qrPagina] = await Promise.all([donosDoEstabelecimento(id), qrSvg(`${SITE_URL}/${estab.slug}`)]);
  const inicial = { ...estab, id: undefined, logo_path: undefined };
  const urlPublica = `${SITE_URL}/${estab.slug}`;

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-3">
        <Link href="/admin" className="flex min-h-11 items-center gap-1 self-start font-semibold text-restinga">
          <ChevronLeft aria-hidden className="size-5" /> Estabelecimentos
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-4xl text-restinga">{estab.nome}</h1>
          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${estab.ativo ? "bg-lima" : "bg-carvao/10"}`}>
            {estab.ativo ? "Ativo" : "Inativo"}
          </span>
        </div>
        <a href={urlPublica} target="_blank" rel="noreferrer" className="flex items-center gap-1 self-start font-semibold text-restinga underline underline-offset-4">
          {urlPublica.replace(/^https?:\/\//, "")} <ExternalLink aria-hidden className="size-4" />
        </a>
        <Link href={`/admin/${id}/clientes`} className={`${classesBotao("principal")} self-start`}>
          <BarChart3 aria-hidden className="size-5" /> Clientes e métricas
        </Link>
        <p className="text-sm text-carvao/80">
          Design da página e do cartão: <strong>{temaDo(estab.slug) === "basico" ? "básico (preto e branco)" : temaDo(estab.slug)}</strong>
        </p>
        {criado ? (
          <p role="status" className="rounded-xl bg-lima px-4 py-3 font-medium">
            Estabelecimento criado. Agora crie o login do dono e baixe o QR Code.
          </p>
        ) : null}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section aria-labelledby="titulo-qr" className="flex flex-col gap-4 rounded-2xl bg-white p-5">
          <h2 id="titulo-qr" className="font-display text-2xl text-restinga">QR Code</h2>
          <div className="flex items-center gap-4">
            <div className="size-32 shrink-0 [&_svg]:size-full" aria-hidden dangerouslySetInnerHTML={{ __html: qrPagina }} />
            <p className="text-sm">Leva para a página de cadastro. Imprima e deixe no balcão ou nas mesas.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href={`/admin/${id}/qr/pdf`} className={classesBotao("principal")} download>
              <Download aria-hidden className="size-5" /> PDF para imprimir
            </a>
            <a href={`/admin/${id}/qr/png`} className={classesBotao("secundario")} download>
              <Download aria-hidden className="size-5" /> PNG
            </a>
          </div>
        </section>

        <section aria-labelledby="titulo-dono" className="flex flex-col gap-4 rounded-2xl bg-white p-5">
          <h2 id="titulo-dono" className="font-display text-2xl text-restinga">Login do dono</h2>
          {dono === "criado" ? (
            <p role="status" className="rounded-xl bg-lima px-4 py-3 font-medium">
              Login criado. Passe ao dono o e-mail e a senha inicial que você digitou.
            </p>
          ) : null}
          {donos.length === 0 ? (
            <FormCriarDono acao={criarLoginDono.bind(null, id)} />
          ) : (
            donos.map((d) => (
              <div key={d.userId} className="flex flex-col gap-3">
                <p>
                  Login: <strong>{d.email}</strong>
                </p>
                <FormRedefinirSenha acao={redefinirSenhaDono.bind(null, id, d.userId)} email={d.email} />
              </div>
            ))
          )}
        </section>
      </div>

      <FormEstabelecimento
        acao={salvarEstabelecimento.bind(null, id)}
        inicial={inicial}
        novo={false}
        urlBase={SITE_URL}
      />

      <section aria-labelledby="titulo-lgpd" className="flex flex-col gap-4 rounded-2xl border-2 border-carvao/15 bg-white p-5">
        <h2 id="titulo-lgpd" className="font-display text-2xl text-restinga">Apagar dados de um cliente (LGPD)</h2>
        <p>
          Use quando um cliente pedir a exclusão. Nome e telefone são apagados e o cartão deixa de funcionar. As visitas continuam
          nas métricas, sem identificar a pessoa. <strong>Não dá para desfazer.</strong>
        </p>
        <FormAnonimizar acao={anonimizarCliente.bind(null, id)} />
      </section>
    </div>
  );
}
