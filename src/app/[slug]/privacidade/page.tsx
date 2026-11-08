import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { estabelecimentoPorSlug } from "@/lib/publico";
import { textoConsentimento, textoNovidades } from "@/lib/dominio/consentimento";
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
          <li>Data e versão do consentimento aceito, se você aceitou receber novidades e promoções, e um código derivado do endereço IP (sem guardar o IP em si).</li>
        </ul>

        <h2>Para que usamos</h2>
        <ul className="list-disc pl-6">
          <li>Manter seu cartão fidelidade, contar carimbos e liberar recompensas.</li>
          <li>Recuperar seu cartão se você trocar de celular (pelo número de telefone).</li>
          <li>Mostrar no cartão avisos sobre seus carimbos e recompensas (por exemplo, quando a recompensa estiver disponível).</li>
          <li>
            Somente se você marcou a caixa opcional: enviar novidades e promoções do estabelecimento pelo cartão. Você liga e
            desliga isso no próprio cartão, em &quot;Novidades e promoções&quot;, quando quiser.
          </li>
          <li>Gerar números agregados para o estabelecimento (quantidade de visitas e de clientes que retornaram).</li>
        </ul>
        <p>Seus dados não são vendidos nem compartilhados com outros estabelecimentos.</p>

        <h2>Notificações no celular</h2>
        <p>
          As notificações na tela do celular só são ligadas se você tocar em &quot;Ativar avisos&quot; no cartão e permitir no
          navegador. Para parar, toque em &quot;Desligar avisos&quot; no cartão ou bloqueie as notificações deste site nas
          configurações do celular.
        </p>

        <h2>Cookies e armazenamento no aparelho</h2>
        <p>
          O cartão não usa cookies de propaganda, de análise ou de rastreamento, nem ferramentas de outras empresas que
          acompanham sua navegação. Este navegador guarda apenas o endereço do seu cartão, para abrir direto da próxima vez
          que você escanear o QR Code, qual recado do cartão você já fechou e, se você ativou os avisos, a inscrição das
          notificações. Para apagar, limpe os dados
          deste site nas configurações do navegador.
        </p>

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
        {textoNovidades(estab.versao_politica, estab.nome) ? (
          <p className="rounded-xl border-2 border-neutral-200 p-4">
            Caixa opcional, que começa desmarcada: “{textoNovidades(estab.versao_politica, estab.nome)}”
          </p>
        ) : null}
        <p className="text-sm text-neutral-600">Versão {estab.versao_politica} do texto de consentimento.</p>
      </article>
    </MolduraPublica>
  );
}
