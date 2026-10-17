import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { estabelecimentoPorSlug } from "@/lib/publico";
import { textoConsentimento } from "@/lib/dominio/consentimento";
import { MolduraPublica } from "@/components/publico/MolduraPublica";
import { FormCadastro } from "@/components/publico/FormCadastro";
import { abrirCartao, cadastrar } from "./acoes";
import { JaTenhoCartao } from "@/components/publico/JaTenhoCartao";
import { AbrirCartaoSalvo } from "@/components/publico/CartaoNoAparelho";
import { CADASTROS } from "@/temas/cadastros";

export async function generateMetadata({ params }: PageProps<"/[slug]">): Promise<Metadata> {
  const estab = await estabelecimentoPorSlug((await params).slug);
  return estab ? { title: `Cartão fidelidade ${estab.nome}` } : {};
}

export async function generateViewport({ params }: PageProps<"/[slug]">): Promise<Viewport> {
  const estab = await estabelecimentoPorSlug((await params).slug);
  return { themeColor: estab?.cor_primaria ?? "#ffffff" };
}

export default async function PaginaCadastro({ params }: PageProps<"/[slug]">) {
  const { slug } = await params;
  const estab = await estabelecimentoPorSlug(slug);
  if (!estab) notFound();

  const formulario = (
    <FormCadastro
      acao={cadastrar.bind(null, slug)}
      slug={slug}
      perguntarPlano={estab.planos.length > 1}
      textoConsentimento={textoConsentimento(estab.versao_politica, estab.nome)}
    />
  );

  // Tema com página de cadastro própria (ex.: Rosa Norte)
  const CadastroDoTema = CADASTROS[estab.tema];
  if (CadastroDoTema && estab.ativo && estab.planos.length > 0) {
    const jaTenho = (
      <>
        <AbrirCartaoSalvo slug={slug} classe="bg-[#0A0A0A] text-[#F3EEE5] font-[family-name:var(--fonte-rosa)] uppercase" />
        <JaTenhoCartao
          acao={abrirCartao.bind(null, slug)}
          classes={{ link: "text-[#C40E4C]", campo: "border-[#0A0A0A]/30 bg-white text-[#0A0A0A]", botao: "bg-[#0A0A0A] text-[#F3EEE5]", erro: "text-[#C40E4C]" }}
        />
      </>
    );
    return <CadastroDoTema estab={{ nome: estab.nome, logoUrl: estab.logoUrl }} formulario={formulario} jaTenho={jaTenho} />;
  }

  return (
    <MolduraPublica estab={estab}>
      {estab.ativo && estab.planos.length > 0 ? (
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-3xl font-bold leading-tight">Seu cartão fidelidade</h1>
            <p className="mt-2 text-lg text-neutral-700">
              Junte carimbos a cada visita e ganhe recompensas. Leva menos de um minuto, sem baixar aplicativo.
            </p>
          </div>
          <AbrirCartaoSalvo slug={slug} />
          <JaTenhoCartao acao={abrirCartao.bind(null, slug)} />
          {formulario}
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-2xl border-2 border-neutral-900 bg-white p-6 text-center">
          <h1 className="text-2xl font-bold">Programa pausado</h1>
          <p className="text-lg text-neutral-700">
            O cartão fidelidade do {estab.nome} não está recebendo cadastros no momento. Pergunte no balcão!
          </p>
        </div>
      )}
    </MolduraPublica>
  );
}
