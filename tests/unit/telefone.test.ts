import { describe, expect, it } from "vitest";
import { formatarTelefone, mascararTelefone, normalizarTelefone } from "@/lib/dominio/telefone";

describe("telefone", () => {
  it.each([
    ["(48) 99999-0001", "+5548999990001"],
    ["48999990001", "+5548999990001"],
    ["+55 48 99999 0001", "+5548999990001"],
    ["5548999990001", "+5548999990001"],
    ["048999990001", "+5548999990001"],
  ])("normaliza %s", (entrada, esperado) => {
    expect(normalizarTelefone(entrada)).toBe(esperado);
  });

  it.each([
    ["4833330001", "fixo sem 9"],
    ["48333300011", "não começa com 9"],
    ["10999990001", "DDD inexistente"],
    ["999990001", "sem DDD"],
    ["", "vazio"],
  ])("recusa %s (%s)", (entrada) => {
    expect(normalizarTelefone(entrada)).toBeNull();
  });

  it("formata e mascara", () => {
    expect(formatarTelefone("+5548999990001")).toBe("(48) 99999-0001");
    expect(mascararTelefone("4899")).toBe("(48) 99");
    expect(mascararTelefone("48999990001999")).toBe("(48) 99999-0001");
  });
});
