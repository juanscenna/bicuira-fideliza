const formatador = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** 1500 → "R$ 15,00" */
export function formatarReais(centavos: number) {
  return formatador.format(centavos / 100);
}

/**
 * Converte o que o dono digitou em centavos. Aceita "15", "15,5", "15,50", "1.234,56", "R$ 15".
 * Devolve null se não for um valor válido.
 */
export function lerReais(texto: string): number | null {
  const limpo = texto.replace(/[R$\s]/g, "");
  if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$|^\d+(\.\d{1,2})?$/.test(limpo)) return null;
  let normalizado: string;
  if (limpo.includes(",")) normalizado = limpo.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(limpo)) normalizado = limpo.replace(/\./g, "");
  else normalizado = limpo;
  const valor = Math.round(Number(normalizado) * 100);
  return Number.isFinite(valor) && valor >= 0 ? valor : null;
}
