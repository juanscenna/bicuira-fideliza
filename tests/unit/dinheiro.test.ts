import { describe, expect, it } from "vitest";
import { formatarReais, lerReais } from "@/lib/dominio/dinheiro";

describe("dinheiro", () => {
  it.each([
    ["15", 1500],
    ["15,5", 1550],
    ["15,50", 1550],
    ["R$ 15,00", 1500],
    ["1.234,56", 123456],
    ["1.234", 123400],
    ["15.50", 1550],
    ["0", 0],
  ])("lê %s como %i centavos", (texto, centavos) => {
    expect(lerReais(texto)).toBe(centavos);
  });

  it.each(["", "abc", "15,555", "-3", "1,2,3"])("recusa %s", (texto) => {
    expect(lerReais(texto)).toBeNull();
  });

  it("formata em reais", () => {
    expect(formatarReais(1500).replace(/\s/g, " ")).toBe("R$ 15,00");
  });
});
