// Regras das notificações (puras, testáveis).

/** Limite do Google: mensagens com notificação por cartão a cada 24 h. */
export const LIMITE_GOOGLE_24H = 3;

export type Origem = "personalizada" | "automatica";

export type HistoricoCliente = {
  personalizadas7d: number; // personalizadas enviadas nos últimos 7 dias
  enviadas24h: number; // qualquer mensagem enviada nas últimas 24 h
};

export type Decisao = { enviar: true; notificarGoogle: boolean } | { enviar: false; motivo: string };

/**
 * Personalizadas: no máximo `maxSemana` por cliente em 7 dias e, para respeitar o Google,
 * nenhuma se o cliente já recebeu 3 mensagens nas últimas 24 h (o cliente é pulado).
 * Automáticas: sempre entram no cartão; só deixam de notificar no Google se passar do limite.
 */
export function decidirEnvio(origem: Origem, h: HistoricoCliente, maxSemana: number): Decisao {
  if (origem === "personalizada") {
    if (h.personalizadas7d >= maxSemana) return { enviar: false, motivo: `limite de ${maxSemana} por semana` };
    if (h.enviadas24h >= LIMITE_GOOGLE_24H) return { enviar: false, motivo: "limite do Google (3 em 24 h)" };
  }
  return { enviar: true, notificarGoogle: h.enviadas24h < LIMITE_GOOGLE_24H };
}

export type TipoAutomatica = "falta_pouco" | "recompensa_disponivel" | "sentimos_falta" | "recompensa_esquecida";

export const AUTOMATICAS: Record<TipoAutomatica, { titulo: string; quando: string }> = {
  falta_pouco: { titulo: "Falta pouco", quando: "Quando o cliente fica a 1 carimbo da recompensa." },
  recompensa_disponivel: { titulo: "Recompensa disponível", quando: "Quando o cartão completa." },
  sentimos_falta: {
    titulo: "Sentimos sua falta",
    quando: "Quando o cliente passa do limite de dias sem visita. Uma vez por período, enviada de dia, em horário comercial.",
  },
  recompensa_esquecida: { titulo: "Recompensa esquecida", quando: "Quando a recompensa está disponível há mais de 15 dias sem resgate." },
};

export function textoAutomatico(tipo: TipoAutomatica, c: { recompensa: string; carimbos: number; meta: number }) {
  switch (tipo) {
    case "falta_pouco":
      return `Falta só 1 carimbo para você ganhar ${c.recompensa}!`;
    case "recompensa_disponivel":
      return `Cartão completo! Mostre no caixa para ganhar ${c.recompensa}.`;
    case "sentimos_falta":
      return `Sentimos sua falta! Seus carimbos continuam no cartão: ${c.carimbos} de ${c.meta}.`;
    case "recompensa_esquecida":
      return `Sua recompensa (${c.recompensa}) está esperando por você. É só mostrar o cartão no caixa.`;
  }
}

export type TipoPublico = "todos" | "moradores" | "turistas" | "inativos" | "perto" | "recompensa" | "selecao";

export const PUBLICOS: Record<TipoPublico, string> = {
  todos: "Todos os clientes",
  moradores: "Só moradores",
  turistas: "Só turistas",
  inativos: "Inativos",
  perto: "Perto da recompensa",
  recompensa: "Com recompensa disponível",
  selecao: "Escolher clientes na lista",
};

/** Horário comercial para as automáticas diárias (fuso de São Paulo). */
export function horarioComercial(agora = new Date()) {
  const hora = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "America/Sao_Paulo", hour: "2-digit", hourCycle: "h23" }).format(agora));
  return hora >= 10 && hora < 20;
}
