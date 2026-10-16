// Tema do estabelecimento: cores configuradas → variáveis CSS com contraste garantido.

function canal(c: number) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function luminancia(hex: string) {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

/** Razão de contraste WCAG entre duas cores (1 a 21). */
export function contraste(a: string, b: string) {
  const [x, y] = [luminancia(a), luminancia(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

export const TEXTO_CLARO = "#FFFFFF";
export const TEXTO_ESCURO = "#1C1C1C";

/** Cor de texto legível sobre um fundo: escolhe branco ou quase-preto, o que contrastar mais. */
export function textoSobre(fundo: string) {
  return contraste(fundo, TEXTO_CLARO) >= contraste(fundo, TEXTO_ESCURO) ? TEXTO_CLARO : TEXTO_ESCURO;
}

export type CoresEstabelecimento = { cor_primaria: string; cor_secundaria: string };

/** Variáveis CSS do tema (usadas na página pública e no cartão). */
export function variaveisTema({ cor_primaria, cor_secundaria }: CoresEstabelecimento) {
  return {
    "--estab-primaria": cor_primaria,
    "--estab-texto-primaria": textoSobre(cor_primaria),
    "--estab-secundaria": cor_secundaria,
    "--estab-texto-secundaria": textoSobre(cor_secundaria),
  } as React.CSSProperties;
}

/**
 * Avalia uma cor para fundo de texto. Cores médias (ex.: laranja, cinza médio) não chegam a 4,5:1
 * nem com branco nem com preto: nesse caso só textos grandes ficam legíveis e o admin mostra aviso.
 */
export function avaliarCor(fundo: string) {
  const texto = textoSobre(fundo);
  const razao = contraste(fundo, texto);
  return { texto, razao, textoPequenoOk: razao >= 4.5, textoGrandeOk: razao >= 3 };
}
