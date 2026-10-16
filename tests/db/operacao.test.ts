// Regras de negócio do painel do dono: gasto mínimo, limite por plano, resgate,
// troca de plano, edição de visita, desfazer e isolamento das funções.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Client } from "pg";
import { comoSistema, comoUsuario, conectar, deveFalhar } from "./ajuda";

const ESTAB = "55555555-0000-4000-8000-00000000000a";
const OUTRO = "55555555-0000-4000-8000-00000000000b";
const DONO = "66666666-0000-4000-8000-00000000000a";
const DONO_OUTRO = "66666666-0000-4000-8000-00000000000b";
let db: Client;
let morador: string;
let turista: string;
let clienteOutro: string;

beforeAll(async () => {
  db = await conectar();
});
afterAll(async () => {
  await db.end();
});

beforeEach(async () => {
  await db.query("begin");
  await comoSistema(db);
  await db.query(`insert into auth.users (id, email) values ($1, 'd1@t.test'), ($2, 'd2@t.test')`, [DONO, DONO_OUTRO]);
  await db.query(`insert into estabelecimentos (id, slug, nome) values ($1, 'op-a', 'Op A'), ($2, 'op-b', 'Op B')`, [ESTAB, OUTRO]);
  await db.query(`insert into perfis (user_id, papel, estabelecimento_id) values ($1, 'dono', $2), ($3, 'dono', $4)`, [DONO, ESTAB, DONO_OUTRO, OUTRO]);
  const cad = async (slug: string, tel: string, plano: string) => {
    const r = await db.query("select cadastrar_cliente($1, 'Cliente', $2, $3, null) as r", [slug, tel, plano]);
    const t = r.rows[0].r.token;
    return (await db.query("select id from clientes where token_cartao = $1", [t])).rows[0].id as string;
  };
  morador = await cad("op-a", "+5548999990001", "morador");
  turista = await cad("op-a", "+5548999990002", "turista");
  clienteOutro = await cad("op-b", "+5548999990003", "morador");
  await comoUsuario(db, DONO);
});
afterEach(async () => {
  await db.query("rollback");
});

type Estado = {
  carimbos: number; meta: number; recompensa_disponivel: boolean; gerou_carimbo?: boolean; motivo?: string | null;
  completou?: boolean; falta_um?: boolean; visita_id?: string; evento_id?: string; aviso?: string | null; delta?: number; plano?: string;
};
async function chamar(sql: string, params: unknown[]): Promise<Estado> {
  const r = await db.query(`select ${sql} as r`, params);
  return r.rows[0].r;
}
const visita = (cliente: string, centavos: number, desc: string | null = null) =>
  chamar("registrar_visita($1, $2, $3)", [cliente, centavos, desc]);
const ajustar = (cliente: string, delta: number) => chamar("ajustar_carimbos($1, $2)", [cliente, delta]);
const resgatar = (cliente: string) => chamar("resgatar($1)", [cliente]);

describe("gasto mínimo", () => {
  it("R$ 15,00 ou mais gera carimbo", async () => {
    const r = await visita(morador, 1500, "Almoço");
    expect(r).toMatchObject({ gerou_carimbo: true, carimbos: 1, meta: 10, motivo: null });
  });

  it("abaixo do mínimo registra a visita sem carimbo", async () => {
    const r = await visita(morador, 1499);
    expect(r).toMatchObject({ gerou_carimbo: false, carimbos: 0, motivo: "abaixo_minimo" });
    const v = await db.query("select count(*)::int n from visitas where cliente_id = $1", [morador]);
    expect(v.rows[0].n).toBe(1);
  });
});

describe("limite de carimbos por plano", () => {
  it("turista completa com 5; visitas seguintes não geram carimbo", async () => {
    let r!: Estado;
    for (let i = 0; i < 5; i++) r = await visita(turista, 2000);
    expect(r).toMatchObject({ carimbos: 5, meta: 5, recompensa_disponivel: true, completou: true });
    r = await visita(turista, 2000);
    expect(r).toMatchObject({ carimbos: 5, gerou_carimbo: false, motivo: "cartao_cheio" });
    const v = await db.query("select count(*)::int n from visitas where cliente_id = $1", [turista]);
    expect(v.rows[0].n).toBe(6);
  });

  it("avisa quando falta 1 carimbo", async () => {
    for (let i = 0; i < 3; i++) await visita(turista, 2000);
    expect((await visita(turista, 2000)).falta_um).toBe(true);
  });

  it("+1/−1 manual nunca fica negativo nem passa do máximo", async () => {
    expect(await deveFalhar(db, "select ajustar_carimbos($1, -1)", [turista])).toMatch(/limite/);
    for (let i = 0; i < 5; i++) await ajustar(turista, 1);
    expect(await deveFalhar(db, "select ajustar_carimbos($1, 1)", [turista])).toMatch(/limite/);
    expect((await ajustar(turista, -1)).carimbos).toBe(4);
    expect(await deveFalhar(db, "select ajustar_carimbos($1, 2)", [turista])).toMatch(/delta_invalido/);
  });
});

describe("resgate", () => {
  it("só com o cartão cheio; volta a 0 e começa novo ciclo", async () => {
    await visita(turista, 2000);
    expect(await deveFalhar(db, "select resgatar($1)", [turista])).toMatch(/incompleto/);
    for (let i = 0; i < 4; i++) await visita(turista, 2000);
    const r = await resgatar(turista);
    expect(r).toMatchObject({ carimbos: 0, recompensa_disponivel: false });
    const c = await db.query("select ciclo, recompensa_desde from clientes where id = $1", [turista]);
    expect(c.rows[0]).toEqual({ ciclo: 2, recompensa_desde: null });
    const e = await db.query("select delta, saldo_apos from eventos_carimbo where cliente_id = $1 and tipo = 'resgate'", [turista]);
    expect(e.rows).toEqual([{ delta: -5, saldo_apos: 0 }]);
  });

  it("o saldo é sempre a soma do registro de eventos", async () => {
    for (let i = 0; i < 5; i++) await visita(turista, 2000);
    await resgatar(turista);
    await visita(turista, 2000);
    await ajustar(turista, 1);
    await ajustar(turista, -1);
    const r = await db.query(
      "select (select sum(delta) from eventos_carimbo where cliente_id = $1)::int s, (select carimbos_atuais from clientes where id = $1) c",
      [turista],
    );
    expect(r.rows[0].s).toBe(r.rows[0].c);
  });
});

describe("troca de plano", () => {
  it("morador com 8 carimbos vira turista: fica 5/5 e a recompensa libera", async () => {
    for (let i = 0; i < 8; i++) await visita(morador, 2000);
    const r = await chamar("trocar_plano($1, 'turista')", [morador]);
    expect(r).toMatchObject({ plano: "turista", carimbos: 5, meta: 5, recompensa_disponivel: true, completou: true });
    const e = await db.query("select delta, dados from eventos_carimbo where cliente_id = $1 and tipo = 'troca_plano'", [morador]);
    expect(e.rows[0]).toEqual({ delta: -3, dados: { de: "morador", para: "turista" } });
  });

  it("turista com 3 carimbos vira morador: mantém 3 de 10", async () => {
    for (let i = 0; i < 3; i++) await visita(turista, 2000);
    expect(await chamar("trocar_plano($1, 'morador')", [turista])).toMatchObject({ carimbos: 3, meta: 10, recompensa_disponivel: false });
  });

  it("recusa plano desativado ou o mesmo plano", async () => {
    expect(await deveFalhar(db, "select trocar_plano($1, 'morador')", [morador])).toMatch(/mesmo_plano/);
    await comoSistema(db);
    await db.query("update planos set ativo = false where estabelecimento_id = $1 and tipo = 'turista'", [ESTAB]);
    await comoUsuario(db, DONO);
    expect(await deveFalhar(db, "select trocar_plano($1, 'turista')", [morador])).toMatch(/plano_invalido/);
  });
});

describe("edição de visita", () => {
  it("corrigir para abaixo do mínimo tira o carimbo; para acima, devolve", async () => {
    const v = await visita(morador, 2000);
    let r = await chamar("editar_visita($1, 1000, 'corrigido')", [v.visita_id]);
    expect(r).toMatchObject({ carimbos: 0, delta: -1, aviso: null });
    r = await chamar("editar_visita($1, 3000, null)", [v.visita_id]);
    expect(r).toMatchObject({ carimbos: 1, delta: 1 });
    const h = await db.query(
      "select dados->>'valor_antigo' antigo, dados->>'valor_novo' novo from eventos_carimbo where visita_id = $1 and tipo = 'ajuste_edicao' order by criado_em, saldo_apos",
      [v.visita_id],
    );
    expect(h.rows).toEqual([{ antigo: "2000", novo: "1000" }, { antigo: "1000", novo: "3000" }]);
    const a = await db.query("select count(*)::int n from auditoria where alvo_id = $1 and acao = 'visita.editar'", [v.visita_id]);
    expect(a.rows[0].n).toBe(2);
  });

  it("depois de um resgate, só corrige o valor e avisa", async () => {
    const primeira = await visita(turista, 2000);
    for (let i = 0; i < 4; i++) await visita(turista, 2000);
    await resgatar(turista);
    const r = await chamar("editar_visita($1, 500, null)", [primeira.visita_id]);
    expect(r).toMatchObject({ carimbos: 0, delta: 0, aviso: "resgate_posterior" });
    const v = await db.query("select valor_centavos, gerou_carimbo from visitas where id = $1", [primeira.visita_id]);
    expect(v.rows[0]).toEqual({ valor_centavos: 500, gerou_carimbo: true });
  });

  it("valor corrigido sem cruzar o mínimo não mexe no carimbo", async () => {
    const v = await visita(morador, 2000);
    expect(await chamar("editar_visita($1, 2500, null)", [v.visita_id])).toMatchObject({ carimbos: 1, delta: 0 });
  });
});

describe("desfazer", () => {
  it("desfaz a visita e o carimbo dela", async () => {
    const v = await visita(morador, 2000);
    const r = await chamar("desfazer_visita($1)", [v.visita_id]);
    expect(r.carimbos).toBe(0);
    expect(await deveFalhar(db, "select desfazer_visita($1)", [v.visita_id])).toMatch(/nao_encontrado/);
  });

  it("desfaz um +1 manual uma única vez", async () => {
    const r = await ajustar(morador, 1);
    expect((await chamar("desfazer_ajuste($1)", [r.evento_id])).carimbos).toBe(0);
    expect(await deveFalhar(db, "select desfazer_ajuste($1)", [r.evento_id])).toMatch(/expirado/);
  });
});

describe("isolamento das operações", () => {
  it("dono não opera cliente de outro estabelecimento", async () => {
    for (const sql of [
      "select registrar_visita($1, 2000, null)",
      "select ajustar_carimbos($1, 1)",
      "select resgatar($1)",
      "select trocar_plano($1, 'turista')",
    ]) {
      expect(await deveFalhar(db, sql, [clienteOutro])).toMatch(/nao_encontrado/);
    }
  });

  it("dono não edita nem desfaz visita de outro estabelecimento", async () => {
    await comoUsuario(db, DONO_OUTRO);
    const v = await visita(clienteOutro, 2000);
    await comoUsuario(db, DONO);
    expect(await deveFalhar(db, "select editar_visita($1, 0, null)", [v.visita_id])).toMatch(/nao_encontrado/);
    expect(await deveFalhar(db, "select desfazer_visita($1)", [v.visita_id])).toMatch(/nao_encontrado/);
  });

  it("estabelecimento desativado não opera", async () => {
    await comoSistema(db);
    await db.query("update estabelecimentos set ativo = false where id = $1", [ESTAB]);
    await comoUsuario(db, DONO);
    expect(await deveFalhar(db, "select registrar_visita($1, 2000, null)", [morador])).toMatch(/inativo/);
  });

  it("lista de clientes só traz os do próprio estabelecimento", async () => {
    const r = await db.query("select distinct estabelecimento_id from clientes_resumo");
    expect(r.rows).toEqual([{ estabelecimento_id: ESTAB }]);
  });

  it("toda operação gera auditoria com o login", async () => {
    await visita(morador, 2000);
    await ajustar(morador, 1);
    const r = await db.query("select acao from auditoria where user_id = $1 order by id", [DONO]);
    expect(r.rows.map((x) => x.acao)).toEqual(["visita.registrar", "carimbo.mais"]);
  });
});
