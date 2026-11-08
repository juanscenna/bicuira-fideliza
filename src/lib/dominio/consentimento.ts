// Textos versionados do consentimento (LGPD). Mudou o texto? Crie uma nova versão
// e aumente versao_politica do estabelecimento: o aceite guarda a versão aceita.
//
// Promoções têm aceite separado do programa (LGPD art. 8º, § 4º):
//   • versão 2: duas caixas no cadastro (a de promoções opcional, desmarcada);
//   • versão 3: uma caixa só (o programa); promoções o cliente liga no cartão, depois de criar.

export const TEXTO_CONSENTIMENTO: Record<number, (nomeEstabelecimento: string) => string> = {
  1: (nome) =>
    `Concordo que ${nome} guarde meu nome e telefone para o programa de fidelidade e me envie mensagens pelo cartão (posso desativá-las no celular).`,
  2: (nome) =>
    `Concordo que ${nome} guarde meu nome e telefone para o programa de fidelidade e me mostre no cartão os avisos sobre meus carimbos e recompensas.`,
  // Versão 3: uma caixa só, curta. Os detalhes ficam na política (link ao lado).
  // Promoções saem do cadastro: o cliente liga depois, no cartão ("Quer receber novidades?").
  3: (nome) => `Aceito os termos do cartão fidelidade de ${nome}.`,
};

/** Caixa opcional de promoções no cadastro (só a versão 2; a 3 pergunta no cartão). */
export const TEXTO_NOVIDADES: Record<number, (nomeEstabelecimento: string) => string> = {
  2: (nome) => `Quero receber novidades e promoções de ${nome} pelo cartão. Opcional: posso desligar quando quiser.`,
};

export function textoConsentimento(versao: number, nomeEstabelecimento: string) {
  return (TEXTO_CONSENTIMENTO[versao] ?? TEXTO_CONSENTIMENTO[1])(nomeEstabelecimento);
}

/** Texto da caixa opcional de novidades no cadastro, ou null quando a versão não tem essa caixa. */
export function textoNovidades(versao: number, nomeEstabelecimento: string) {
  const texto = TEXTO_NOVIDADES[versao];
  return texto ? texto(nomeEstabelecimento) : null;
}
