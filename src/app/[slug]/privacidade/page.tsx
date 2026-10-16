import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { estabelecimentoPorSlug } from "@/lib/publico";
import { textoConsentimento } from "@/lib/dominio/consentimento";
import { MolduraPublica } from "@/components/publico/MolduraPublica";

export const metadata: Metadata = { title: "Política de privacidade" };

/** Política gerada a partir de um modelo simples, com os dados do estabelecimento. */
export default async function Privacidade({ params }: PageProps<"/[slug]/privacidade">) {
  const { slug } = await params;
  const estab = await estabelecimentoPorSlug(slug);
  if (!estab) notFound();
  const contato = estab.contato_privacidade;

  return (
    <MolduraPublica estab={estab}>
      <article className="flex flex-col gap-5 text-base leading-relaxed [&_h2]:text-xl [&_h2]:font-bold">
        <h1 className="text-3xl font-bold">Política de privacidade</h1>
        <p>
          Esta política explica como o <strong>{estab.nome}</strong> trata os dados do programa de fidelidade. O sistema é
          fornecido pela Bicuíra Digital, que opera a tecnologia em nome do estabelecimento.
        </p>

        <h2>Dados coletados</h2>
        <ul className="list-disc pl-6">
          <li>Nome e número de celular, informados por você no cadastro.</li>
          <li>Se você é morador da região ou está de visita (define as regras do seu cartão).</li>
          <li>Visitas registradas pelo estabelecimento: data, valor gasto e, às vezes, uma descrição do consumo.</li>
          <li>Carimbos e recompensas resgatadas.</li>
          <li>Data e versão do consentimento aceito, e um código derivado do endereço IP (sem guardar o IP em si).</li>
        </ul>

        <h2>Para que usamos</h2>
        <ul className="list-disc pl-6">
          <li>Manter seu cartão fidelidade, contar carimbos e liberar recompensas.</li>
          <li>Recuperar seu cartão se você trocar de celular (pelo número de telefone).</li>
          <li>Enviar avisos pelo próprio cartão (por exemplo, quando a recompensa estiver disponível). Você pode desativar as notificações no celular a qualquer momento.</li>
          <li>Gerar números agregados para o estabelecimento (quantidade de visitas e de clientes que retornaram).</li>
        </ul>
        <p>Seus dados não são vendidos nem compartilhados com outros estabelecimentos.</p>

        <h2>Seus direitos e como pedir exclusão</h2>
        <p>
          Você pode pedir para ver, corrigir ou apagar seus dados.{" "}
          {contato ? (
            <>
              Fale com o estabelecimento: <strong>{contato}</strong>.
            </>
          ) : (
            <>Peça diretamente no balcão do estabelecimento.</>
          )}{" "}
          Quando os dados são apagados, o cartão deixa de funcionar e as visitas ficam apenas como números, sem identificar você.
        </p>

        <h2>Consentimento</h2>
        <p className="rounded-xl bg-neutral-100 p-4">“{textoConsentimento(estab.versao_politica, estab.nome)}”</p>
        <p className="text-sm text-neutral-600">Versão {estab.versao_politica} do texto de consentimento.</p>
      </article>
    </MolduraPublica>
  );
}
