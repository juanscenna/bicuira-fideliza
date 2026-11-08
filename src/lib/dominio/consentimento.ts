// Textos versionados do consentimento (LGPD). Mudou o texto? Crie uma nova versão
// e aumente versao_politica do estabelecimento: o aceite guarda a versão aceita.
//
// Desde a versão 2 são DUAS caixas (LGPD art. 8º, § 4º: consentimento para finalidade determinada):
//   • obrigatória: o programa de fidelidade (cartão, carimbos e avisos do próprio cartão);
//   • opcional, começa desmarcada: novidades e promoções do estabelecimento.

export const TEXTO_CONSENTIMENTO: Record<number, (nomeEstabelecimento: string) => string> = {
  1: (nome) =>
    `Concordo que ${nome} guarde meu nome e telefone para o programa de fidelidade e me envie mensagens pelo cartão (posso desativá-las no celular).`,
  2: (nome) =>
    `Concordo que ${nome} guarde meu nome e telefone para o programa de fidelidade e me mostre no cartão os avisos sobre meus carimbos e recompensas.`,
};

/** Caixa opcional (versão 2 em diante). */
export const TEXTO_NOVIDADES: Record<number, (nomeEstabelecimento: string) => string> = {
  2: (nome) => `Quero receber novidades e promoções de ${nome} pelo cartão. Opcional: posso desligar quando quiser.`,
};

export function textoConsentimento(versao: number, nomeEstabelecimento: string) {
  return (TEXTO_CONSENTIMENTO[versao] ?? TEXTO_CONSENTIMENTO[1])(nomeEstabelecimento);
}

/** Texto da caixa opcional de novidades, ou null nas versões antigas (que tinham uma caixa só). */
export function textoNovidades(versao: number, nomeEstabelecimento: string) {
  const texto = TEXTO_NOVIDADES[versao];
  return texto ? texto(nomeEstabelecimento) : null;
}
