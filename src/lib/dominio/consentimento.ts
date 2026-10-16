// Textos versionados do consentimento (LGPD). Mudou o texto? Crie uma nova versão
// e aumente versao_politica do estabelecimento: o aceite guarda a versão aceita.

export const TEXTO_CONSENTIMENTO: Record<number, (nomeEstabelecimento: string) => string> = {
  1: (nome) =>
    `Concordo que ${nome} guarde meu nome e telefone para o programa de fidelidade e me envie mensagens pelo cartão (posso desativá-las no celular).`,
};

export function textoConsentimento(versao: number, nomeEstabelecimento: string) {
  return (TEXTO_CONSENTIMENTO[versao] ?? TEXTO_CONSENTIMENTO[1])(nomeEstabelecimento);
}
