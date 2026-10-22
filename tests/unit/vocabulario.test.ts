import { describe, expect, it, vi } from "vitest";

// config.ts lê as variáveis públicas do Supabase ao ser importado
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= "http://localhost";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??= "teste";
});
import { termosDo, traduzir } from "@/temas/vocabulario";

describe("vocabulário do painel", () => {
  const pousada = termosDo("pousadasonhosdorosa");
  const restaurante = termosDo("comida-caseira-rosa-norte");

  it("pousada troca visita por hospedagem e caixa por recepção", () => {
    expect(traduzir("Registrar visita", pousada)).toBe("Registrar hospedagem");
    expect(traduzir("Nº de visitas", pousada)).toBe("Nº de hospedagens");
    expect(traduzir("Visita removida.", pousada)).toBe("Hospedagem removida.");
    expect(traduzir("Cartão completo! Mostre no caixa para ganhar 1 café.", pousada)).toBe("Cartão completo! Mostre na recepção para ganhar 1 café.");
    expect(traduzir("Não representam o faturamento do restaurante.", pousada)).toBe("Não representam o faturamento da pousada.");
    expect(pousada.mostrarPlanos).toBe(false);
  });

  it("não troca pedaços de palavras", () => {
    expect(traduzir("visitante", pousada)).toBe("visitante");
  });

  it("restaurante continua com os textos de sempre", () => {
    expect(traduzir("Registrar visita", restaurante)).toBe("Registrar visita");
    expect(restaurante.exemploMensagem).toBe("Ex.: Hoje tem moqueca no almoço!");
    expect(restaurante.mostrarPlanos).toBe(true);
  });
});
