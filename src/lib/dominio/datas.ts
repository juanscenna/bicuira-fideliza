// Datas no fuso de Garopaba/Imbituba (America/Sao_Paulo, sem horário de verão desde 2019).
export const FUSO = "America/Sao_Paulo";

const fmtDiaHora = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const fmtDia = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, day: "2-digit", month: "2-digit", year: "numeric" });
const fmtIso = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" });

export const formatarDiaHora = (iso: string) => fmtDiaHora.format(new Date(iso)).replace(",", "");
export const formatarDia = (iso: string) => fmtDia.format(new Date(iso));

/** Início do dia de hoje em São Paulo, como instante ISO (UTC). */
export function inicioDoDia(agora = new Date()) {
  return new Date(`${fmtIso.format(agora)}T00:00:00-03:00`).toISOString();
}

/** "há 3 dias", "hoje", "ontem" */
export function relativo(iso: string | null, agora = new Date()) {
  if (!iso) return "nunca";
  const dias = Math.floor((new Date(inicioDoDia(agora)).getTime() - new Date(inicioDoDia(new Date(iso))).getTime()) / 86_400_000);
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  return `há ${dias} dias`;
}

/** Instante de N dias atrás (ISO), para filtros de período. */
export function diasAtras(dias: number, agora = new Date()) {
  return new Date(agora.getTime() - dias * 86_400_000).toISOString();
}
