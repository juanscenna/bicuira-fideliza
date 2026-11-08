// Selos dados (cobrança mensal): o que conta, o que desconta e o que não muda.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Client } from "pg";
import { comoSistema, comoUsuario, conectar } from "./ajuda";

const ESTAB = "77777777-0000-4000-8000-00000000000a";
const OUTRO = "77777777-0000-4000-8000-00000000000b";
const DONO = "88888888-0000-4000-8000-00000000000a";
const DONO_OUTRO = "88888888-0000-4000-8000-00000000000b";
let db: Client;
let cliente: string;

beforeAll(async () => {
  db = await conectar();
});
afterAll(async () => {
  await db.end();
});

beforeEach(async () => {
  await db.query("begin");
  await comoSistema(db);
  await db.query(`insert into auth.users (id, email) values ($1, 's1@t.test'), ($2, 's2@t.test')`, [DONO, DONO_OUTRO]);
  await db.query(`insert into estabelecimentos (id, slug, nome) values ($1, 'selos-a', 'Selos A'), ($2, 'selos-b', 'Selos B')`, [ESTAB, OUTRO]);
  await db.query(`insert into perfis (user_id, papel, estabelecimento_id) values ($1, 'dono', $2), ($3, 'dono', $4)`, [DONO, ESTAB, DONO_OUTRO, OUTRO]);
  await db.query(`update planos set carimbos_meta = 3 where estabelecimento_id = $1`, [ESTAB]);
  const r = await db.query("select cadastrar_cliente('selos-a', 'Cliente', '+5548999991001', 'morador', null) as r");
  cliente = (await db.query("select id from clientes where token_cartao = $1", [r.rows[0].r.token])).rows[0].id;
  await comoUsuario(db, DONO);
});
afterEach(async () => {
  await db.query("rollback");
});

async function selosDoMes(estab = ESTAB): Promise<number> {
  const r = await db.query("select selos from selos_por_mes($1, 1)", [estab]);
  return r.rows[0]?.selos ?? 0;
}
const visita = async (centavos: number) => (await db.query("select registrar_visita($1, $2, null) as r", [cliente, centavos])).rows[0].r;

describe("selos dados no mês", () => {
  it("visita com selo conta; visita abaixo do mínimo não conta", async () => {
    await visita(1500);
    await visita(1500);
    await visita(500); // abaixo do gasto mínimo: sem selo
    expect(await selosDoMes()).toBe(2);
  });

  it("+1 manual conta e -1 manual desconta", async () => {
    await db.query("select ajustar_carimbos($1, 1)", [cliente]);
    await db.query("select ajustar_carimbos($1, 1)", [cliente]);
    await db.query("select ajustar_carimbos($1, -1)", [cliente]);
    expect(await selosDoMes()).toBe(1);
  });

  it("desfazer e remover visita descontam o selo", async () => {
    const a = await visita(1500);
    const b = await visita(1500);
    await db.query("select desfazer_visita($1)", [a.visita_id]);
    await db.query("select remover_visita($1)", [b.visita_id]);
    expect(await selosDoMes()).toBe(0);
  });

  it("resgate não desconta: os selos foram dados", async () => {
    await visita(1500);
    await visita(1500);
    await visita(1500);
    await db.query("select resgatar($1)", [cliente]);
    expect(await selosDoMes()).toBe(3);
  });

  it("apagar o cliente não muda os selos já dados", async () => {
    await visita(1500);
    await visita(1500);
    await comoSistema(db);
    await db.query("delete from clientes where id = $1", [cliente]);
    await comoUsuario(db, DONO);
    expect(await selosDoMes()).toBe(2);
  });

  it("dono não vê os selos de outro estabelecimento e não consegue gravar", async () => {
    await visita(1500);
    await comoUsuario(db, DONO_OUTRO);
    expect(await selosDoMes(ESTAB)).toBe(0);
    await expect(db.query("insert into selos_dados values (gen_random_uuid(), $1, 5, now())", [OUTRO])).rejects.toThrow();
  });

  it("meses sem selo aparecem com zero", async () => {
    const r = await db.query("select mes, selos from selos_por_mes($1, 3)", [ESTAB]);
    expect(r.rows).toHaveLength(3);
    expect(r.rows.every((x) => x.selos === 0)).toBe(true);
  });
});
