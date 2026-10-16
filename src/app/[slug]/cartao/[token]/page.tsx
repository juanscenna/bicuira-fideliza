import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { estabelecimentoPorSlug } from "@/lib/publico";
import { carregarCartao } from "@/lib/cartao";
import { qrSvg } from "@/lib/qr";
import { formatarReais } from "@/lib/dominio/dinheiro";
import { appleConfigurado, googleConfigurado, walletVisivel } from "@/lib/wallet/config";
import { MolduraPublica } from "@/components/publico/MolduraPublica";
import { CartaoAoVivo } from "@/components/publico/CartaoAoVivo";
import { BotoesWallet, SalvarNaTelaInicial } from "@/components/publico/BotoesWallet";

type P = PageProps<"/[slug]/cartao/[token]">;

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug, token } = await params;
  const estab = await estabelecimentoPorSlug(slug);
  return {
    title: estab ? `Meu cartão · ${estab.nome}` : "Cartão",
    robots: { index: false, follow: false },
    referrer: "no-referrer", // o link do cartão é secreto: não vaza para outros sites
    manifest: `/${slug}/cartao/${token}/manifest.webmanifest`,
    appleWebApp: { capable: true, title: estab?.nome ?? "Cartão", statusBarStyle: "default" },
    icons: { apple: `/${slug}/icone/180` },
  };
}

export async function generateViewport({ params }: P): Promise<Viewport> {
  const estab = await estabelecimentoPorSlug((await params).slug);
  return { themeColor: estab?.cor_primaria ?? "#ffffff" };
}

export default async function PaginaCartao({ params, searchParams }: P) {
  const { slug, token } = await params;
  const { novo, recuperado } = await searchParams;
  const estab = await estabelecimentoPorSlug(slug);
  if (!estab) notFound();
  const cartao = await carregarCartao(estab.id, token);
  if (!cartao) notFound();

  const plano = estab.planos.find((p) => p.tipo === cartao.plano);

  return (
    <MolduraPublica estab={estab}>
      <div className="flex flex-col gap-6">
        {novo ? (
          <p role="status" className="rounded-2xl bg-white p-4 text-lg font-semibold">
            Pronto, {cartao.nome.split(" ")[0]}! Seu cartão foi criado.
          </p>
        ) : recuperado ? (
          <p role="status" className="rounded-2xl bg-white p-4 text-lg font-semibold">
            Este telefone já tinha um cartão: aqui está ele, com seus carimbos.
          </p>
        ) : null}

        <CartaoAoVivo
          token={token}
          slug={slug}
          estab={{ nome: estab.nome, logoUrl: estab.logoUrl, cor_primaria: estab.cor_primaria, cor_secundaria: estab.cor_secundaria }}
          inicial={cartao}
          qrSvg={await qrSvg(cartao.codigo)}
        />

        <section aria-labelledby="titulo-wallet" className="flex flex-col gap-3">
          <h2 id="titulo-wallet" className="text-xl font-bold">
            Guarde no celular
          </h2>
          {walletVisivel() ? <BotoesWallet token={token} slug={slug} apple={appleConfigurado()} google={googleConfigurado()} /> : null}
          <SalvarNaTelaInicial />
        </section>

        {/* "Verso" do cartão */}
        <section aria-labelledby="titulo-regras" className="flex flex-col gap-2 rounded-2xl bg-white p-5">
          <h2 id="titulo-regras" className="text-xl font-bold">
            Como funciona
          </h2>
          <ul className="list-disc pl-6 text-base leading-relaxed">
            <li>
              Mostre o código <strong className="font-mono">{cartao.codigo}</strong> no caixa a cada visita.
            </li>
            <li>Visitas a partir de {formatarReais(estab.gasto_minimo_centavos)} ganham 1 carimbo.</li>
            {plano ? (
              <li>
                Com {plano.carimbos_meta} carimbos você ganha: <strong>{plano.recompensa_texto}</strong>.
              </li>
            ) : null}
            <li>A recompensa é entregue no balcão e o cartão começa de novo.</li>
          </ul>
          <p className="mt-2 text-sm text-neutral-600">
            Guarde este link: é o seu cartão. Trocou de celular? Cadastre de novo com o mesmo telefone.
          </p>
          <Link href={`/${slug}/privacidade`} className="mt-2 self-start text-sm font-semibold underline underline-offset-2">
            Política de privacidade
          </Link>
        </section>
      </div>
    </MolduraPublica>
  );
}
