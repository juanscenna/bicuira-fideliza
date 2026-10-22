import { describe, expect, it } from "vitest";
import { gerarSlug, validarEstabelecimento, validarSlug, type DadosEstabelecimento } from "@/lib/dominio/estabelecimento";
import { avaliarCor, contraste, textoSobre, TEXTO_CLARO, TEXTO_ESCURO } from "@/lib/tema";

const base: DadosEstabelecimento = {
  nome: "Restaurante Teste",
  slug: "restaurante-teste",
  tipo_negocio: "restaurante",
  gasto_minimo_centavos: 1500,
  dias_inatividade: 30,
  max_personalizadas_semana: 2,
  contato_privacidade: null,
  ativo: true,
  cobranca_plano: null,
  cobranca_status: null,
  cobranca_vencimento: null,
  morador: { ativo: true, carimbos_meta: 10, recompensa_texto: "1 prato" },
  turista: { ativo: true, carimbos_meta: 5, recompensa_texto: "1 sobremesa" },
};

describe("estabelecimento", () => {
  it("gera endereço sem acentos e símbolos", () => {
    expect(gerarSlug("Bar do Zé & Cia.")).toBe("bar-do-ze-cia");
    expect(gerarSlug("  Pousada  Sonhos do Rosa ")).toBe("pousada-sonhos-do-rosa");
  });

  it("recusa endereços reservados ou inválidos", () => {
    expect(validarSlug("painel")).toMatch(/reservado/);
    expect(validarSlug("Com Espaço")).toMatch(/minúsculas/);
    expect(validarSlug("ab")).toMatch(/3 caracteres/);
    expect(validarSlug("restaurante-teste")).toBeNull();
  });

  it("aceita os padrões do piloto", () => {
    expect(validarEstabelecimento(base)).toEqual({});
  });

  it("exige pelo menos um plano ativo", () => {
    const e = validarEstabelecimento({ ...base, morador: { ...base.morador, ativo: false }, turista: { ...base.turista, ativo: false } });
    expect(e.planos).toBeDefined();
  });

  it("aceita inatividade sem limite (null) e até 3650 dias", () => {
    expect(validarEstabelecimento({ ...base, dias_inatividade: null }).dias_inatividade).toBeUndefined();
    expect(validarEstabelecimento({ ...base, dias_inatividade: 3650 }).dias_inatividade).toBeUndefined();
    expect(validarEstabelecimento({ ...base, dias_inatividade: 3651 }).dias_inatividade).toBeDefined();
    expect(validarEstabelecimento({ ...base, dias_inatividade: 0 }).dias_inatividade).toBeDefined();
  });

  it("limita carimbos por plano entre 1 e 30", () => {
    expect(validarEstabelecimento({ ...base, turista: { ...base.turista, carimbos_meta: 0 } }).turista_meta).toBeDefined();
    expect(validarEstabelecimento({ ...base, morador: { ...base.morador, carimbos_meta: 31 } }).morador_meta).toBeDefined();
  });
});

describe("tema", () => {
  it("escolhe sempre a cor de texto que mais contrasta", () => {
    for (const cor of ["#000000", "#FFFFFF", "#C35E2F", "#B4CD64", "#25433D", "#FFEB3B", "#1E88E5", "#777777"]) {
      const escolhida = contraste(cor, textoSobre(cor));
      expect(escolhida).toBeGreaterThanOrEqual(Math.max(contraste(cor, TEXTO_CLARO), contraste(cor, TEXTO_ESCURO)));
      expect(escolhida).toBeGreaterThanOrEqual(3); // texto grande sempre legível
    }
  });

  it("avisa quando a cor não serve para texto pequeno", () => {
    expect(avaliarCor("#25433D").textoPequenoOk).toBe(true);
    expect(avaliarCor("#C35E2F").textoPequenoOk).toBe(false);
  });
});
