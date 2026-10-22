import { describe, expect, it, vi } from "vitest";

// config.ts lê as variáveis públicas do Supabase ao ser importado
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= "http://localhost";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??= "teste";
});
import { automaticaDo, termosDo, textoAutomaticoDo, traduzir } from "@/temas/vocabulario";

describe("vocabulário do painel", () => {
  const pousada = termosDo({ slug: "pousadasonhosdorosa", tipo_negocio: "pousada" });
  const restaurante = termosDo({ slug: "comida-caseira-rosa-norte", tipo_negocio: "restaurante" });

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

  it("avisos automáticos da pousada usam textos próprios", () => {
    const c = { recompensa: "1 café da manhã", carimbos: 2, meta: 3 };
    expect(textoAutomaticoDo("falta_pouco", c, pousada)).toBe("Falta só 1 hospedagem para você ganhar 1 café da manhã! Esperamos você de volta na Praia do Rosa.");
    expect(textoAutomaticoDo("sentimos_falta", c, pousada)).toContain("2 de 3");
    expect(automaticaDo("recompensa_esquecida", pousada).titulo).toBe("Recompensa guardada");
  });

  it("avisos automáticos do restaurante não mudam", () => {
    const c = { recompensa: "1 prato", carimbos: 9, meta: 10 };
    expect(textoAutomaticoDo("recompensa_disponivel", c, restaurante)).toBe("Cartão completo! Mostre no caixa para ganhar 1 prato.");
    expect(automaticaDo("sentimos_falta", restaurante).titulo).toBe("Sentimos sua falta");
  });

  it("pousada sela por estadia; bar e restaurante, por gasto", () => {
    expect(pousada.porEstadia).toBe(true);
    expect(restaurante.porEstadia).toBe(false);
    const bar = termosDo({ slug: "bar-do-ze", tipo_negocio: "bar" });
    expect(bar.porEstadia).toBe(false);
    expect(traduzir("Não representam o faturamento do restaurante.", bar)).toBe("Não representam o faturamento do bar.");
  });

  it("pousada sem tema próprio não cita a Praia do Rosa", () => {
    const outra = termosDo({ slug: "pousada-qualquer", tipo_negocio: "pousada" });
    expect(textoAutomaticoDo("falta_pouco", { recompensa: "1 café", carimbos: 2, meta: 3 }, outra)).not.toContain("Praia do Rosa");
  });
});

