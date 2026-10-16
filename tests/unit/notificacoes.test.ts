import { describe, expect, it } from "vitest";
import { decidirEnvio, horarioComercial, textoAutomatico } from "@/lib/notificacoes/regras";

describe("limite de notificações", () => {
  it("personalizada: até 2 por semana (padrão)", () => {
    expect(decidirEnvio("personalizada", { personalizadas7d: 1, enviadas24h: 0 }, 2)).toEqual({ enviar: true, notificarGoogle: true });
    expect(decidirEnvio("personalizada", { personalizadas7d: 2, enviadas24h: 0 }, 2)).toEqual({ enviar: false, motivo: "limite de 2 por semana" });
  });

  it("limite semanal configurável pelo super admin", () => {
    expect(decidirEnvio("personalizada", { personalizadas7d: 2, enviadas24h: 0 }, 3).enviar).toBe(true);
    expect(decidirEnvio("personalizada", { personalizadas7d: 0, enviadas24h: 0 }, 0).enviar).toBe(false);
  });

  it("personalizada acima de 3 em 24 h ainda sai (cartão e aviso do site), sem notificar no Google", () => {
    expect(decidirEnvio("personalizada", { personalizadas7d: 0, enviadas24h: 3 }, 2)).toEqual({ enviar: true, notificarGoogle: false });
  });

  it("automática sempre entra no cartão, mas sem notificar no Google depois de 3 em 24 h", () => {
    expect(decidirEnvio("automatica", { personalizadas7d: 9, enviadas24h: 2 }, 2)).toEqual({ enviar: true, notificarGoogle: true });
    expect(decidirEnvio("automatica", { personalizadas7d: 9, enviadas24h: 3 }, 2)).toEqual({ enviar: true, notificarGoogle: false });
  });
});

describe("textos e horário", () => {
  it("textos automáticos usam a recompensa do plano", () => {
    expect(textoAutomatico("falta_pouco", { recompensa: "1 prato", carimbos: 9, meta: 10 })).toBe("Falta só 1 carimbo para você ganhar 1 prato!");
    expect(textoAutomatico("sentimos_falta", { recompensa: "1 prato", carimbos: 3, meta: 10 })).toContain("3 de 10");
  });

  it("horário comercial em São Paulo (10h às 20h)", () => {
    expect(horarioComercial(new Date("2026-10-15T13:00:00Z"))).toBe(true); // 10h em SP
    expect(horarioComercial(new Date("2026-10-15T12:59:00Z"))).toBe(false); // 9h59
    expect(horarioComercial(new Date("2026-10-15T23:00:00Z"))).toBe(false); // 20h
  });
});
