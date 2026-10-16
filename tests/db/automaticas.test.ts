// Quem recebe as automáticas diárias: "sentimos sua falta" e "recompensa esquecida".
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Client } from "pg";
import { comoSistema, conectar } from "./ajuda";

const ESTAB = "99999999-0000-4000-8000-00000000000a";
let db: Client;

beforeAll(async () => {
  db = await conectar();
});
afterAll(async () => {
  await db.end();
});
beforeEach(async () => {
  await db.query("begin");
  await comoSistema(db);
  await db.query(`insert into estabelecimentos (id, slug, nome, dias_inatividade) values ($1, 'auto-a', 'Auto A', 30)`, [ESTAB]);
});
afterEach(async () => {
  await db.query("rollback");
});

async function cliente(codigo: string, plano: string, diasSemVisita: number, recompensaHaDias: number | null = null) {
  const r = await db.query(
    `insert into clientes (estabelecimento_id, nome, telefone, codigo, plano_tipo, criado_em, ultima_visita_em, recompensa_desde)
     values ($1, $2, $3, $2, $4, now() - interval '200 days', now() - make_interval(days => $5),
             case when $6::int is null then null else now() - make_interval(days => $6::int) end)
     returning id`,
    [ESTAB, codigo, `+5548999${codigo.charCodeAt(0)}${codigo.slice(1)}`, plano, diasSemVisita, recompensaHaDias],
  );
  return r.rows[0].id as string;
}
const candidatos = async () =>
  (await db.query("select cliente_id, tipo from candidatos_automaticos() where estabelecimento_id = $1 order by tipo", [ESTAB])).rows;

describe("automáticas diárias", () => {
  it("sentimos sua falta: só moradores por padrão, depois do limite de dias", async () => {
    const morador = await cliente("A1111", "morador", 31);
    await cliente("B1111", "turista", 40);
    await cliente("C1111", "morador", 10);
    expect(await candidatos()).toEqual([{ cliente_id: morador, tipo: "sentimos_falta" }]);
  });

  it("uma vez por período de inatividade", async () => {
    const id = await cliente("A1111", "morador", 31);
    await db.query(
      `insert into envios (estabelecimento_id, cliente_id, origem, automacao_tipo, texto, status) values ($1, $2, 'automatica', 'sentimos_falta', 'x', 'enviado')`,
      [ESTAB, id],
    );
    expect(await candidatos()).toEqual([]);
    // voltou e sumiu de novo: novo período
    await db.query("update clientes set ultima_visita_em = now() - interval '31 days' + interval '1 second' where id = $1", [id]);
    await db.query("update envios set criado_em = now() - interval '60 days' where cliente_id = $1", [id]);
    expect((await candidatos()).length).toBe(1);
  });

  it("turistas entram quando o dono liga a automática", async () => {
    const turista = await cliente("B1111", "turista", 40);
    await db.query("update automacoes set ativa_turista = true where estabelecimento_id = $1 and tipo = 'sentimos_falta'", [ESTAB]);
    expect(await candidatos()).toEqual([{ cliente_id: turista, tipo: "sentimos_falta" }]);
  });

  it("recompensa esquecida: disponível há mais de 15 dias, uma vez por recompensa", async () => {
    const id = await cliente("D1111", "morador", 5, 16);
    await cliente("E1111", "morador", 5, 10);
    expect(await candidatos()).toEqual([{ cliente_id: id, tipo: "recompensa_esquecida" }]);
    await db.query(
      `insert into envios (estabelecimento_id, cliente_id, origem, automacao_tipo, texto, status) values ($1, $2, 'automatica', 'recompensa_esquecida', 'x', 'enviado')`,
      [ESTAB, id],
    );
    expect(await candidatos()).toEqual([]);
  });

  it("automática desligada ou estabelecimento inativo não gera envio", async () => {
    await cliente("A1111", "morador", 31);
    await db.query("update automacoes set ativa_morador = false where estabelecimento_id = $1 and tipo = 'sentimos_falta'", [ESTAB]);
    expect(await candidatos()).toEqual([]);
    await db.query("update automacoes set ativa_morador = true where estabelecimento_id = $1", [ESTAB]);
    await db.query("update estabelecimentos set ativo = false where id = $1", [ESTAB]);
    expect(await candidatos()).toEqual([]);
  });
});
