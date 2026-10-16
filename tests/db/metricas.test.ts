// Cálculo das métricas: retorno, gasto de retorno, ticket, períodos, planos e isolamento.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Client } from "pg";
import { comoSistema, comoUsuario, conectar } from "./ajuda";

const ESTAB = "77777777-0000-4000-8000-00000000000a";
const OUTRO = "77777777-0000-4000-8000-00000000000b";
const DONO = "88888888-0000-4000-8000-00000000000a";
let db: Client;

beforeAll(async () => {
  db = await conectar();
});
afterAll(async () => {
  await db.end();
});

async function cliente(estab: string, codigo: string, plano: string, diasAtras: number, visitas: [number, number][], desfeita = false) {
  const r = await db.query(
    `insert into clientes (estabelecimento_id, nome, telefone, codigo, plano_tipo, criado_em, ultima_visita_em)
     values ($1, $2, $3, $2, $4, now() - make_interval(days => $5), $6) returning id`,
    [estab, codigo, `+5548999${codigo.charCodeAt(0)}${codigo.slice(1)}`, plano, diasAtras,
     visitas.length ? new Date(Date.now() - Math.min(...visitas.map((v) => v[0])) * 86400000).toISOString() : null],
  );
  for (const [dias, centavos] of visitas) {
    await db.query(
      `insert into visitas (estabelecimento_id, cliente_id, valor_centavos, ciclo, criado_em, desfeita_em)
       values ($1, $2, $3, 1, now() - make_interval(days => $4), $5)`,
      [estab, r.rows[0].id, centavos, dias, desfeita ? new Date().toISOString() : null],
    );
  }
  return r.rows[0].id as string;
}

beforeEach(async () => {
  await db.query("begin");
  await comoSistema(db);
  await db.query(`insert into auth.users (id, email) values ($1, 'm@t.test')`, [DONO]);
  await db.query(`insert into estabelecimentos (id, slug, nome) values ($1, 'met-a', 'Met A'), ($2, 'met-b', 'Met B')`, [ESTAB, OUTRO]);
  await db.query(`insert into perfis (user_id, papel, estabelecimento_id) values ($1, 'dono', $2)`, [DONO, ESTAB]);

  // Morador A: 3 visitas (60, 20 e 2 dias atrás)
  await cliente(ESTAB, "A1000", "morador", 90, [[60, 2000], [20, 3000], [2, 4000]]);
  // Turista B: 1 visita há 5 dias
  await cliente(ESTAB, "B1000", "turista", 5, [[5, 1000]]);
  // Morador C: 2 visitas, a 2ª há 3 dias; e uma resgatada
  const c = await cliente(ESTAB, "C1000", "morador", 40, [[40, 5000], [3, 1500]]);
  await db.query(
    `insert into eventos_carimbo (estabelecimento_id, cliente_id, tipo, delta, saldo_apos, ciclo, criado_em)
     values ($1, $2, 'resgate', 0, 0, 1, now() - interval '3 days')`,
    [ESTAB, c],
  );
  // Morador D: cadastrado há 100 dias, nunca voltou (inativo)
  await cliente(ESTAB, "D1000", "morador", 100, [[100, 2500]]);
  // Turista E: visita desfeita (não conta)
  await cliente(ESTAB, "E1000", "turista", 1, [[1, 9900]], true);
  // Outro estabelecimento: não pode aparecer
  await cliente(OUTRO, "F1000", "morador", 1, [[1, 100000], [0, 100000]]);
  await comoUsuario(db, DONO);
});
afterEach(async () => {
  await db.query("rollback");
});

async function metricas(dias: number | null, plano: string | null = null) {
  const r = await db.query("select metricas(case when $1::int is null then null else now() - make_interval(days => $1::int) end, $2) as m", [dias, plano]);
  return r.rows[0].m;
}

describe("métricas", () => {
  it("tudo: totais, retorno e gasto de retorno", async () => {
    expect(await metricas(null)).toEqual({
      clientes_cadastrados: 5,
      clientes_com_visita: 4, // E só tem visita desfeita
      clientes_que_retornaram: 2, // A e C
      visitas_de_retorno: 3, // A: 2ª e 3ª; C: 2ª
      gasto_retorno_centavos: 3000 + 4000 + 1500,
      total_visitas: 7,
      gasto_total_centavos: 2000 + 3000 + 4000 + 1000 + 5000 + 1500 + 2500,
      recompensas_resgatadas: 1,
      clientes_inativos: 1, // só D (sem visita há 100 dias)
    });
  });

  it("últimos 7 dias: a primeira visita antiga ainda define quem é retorno", async () => {
    const m = await metricas(7);
    expect(m).toMatchObject({
      clientes_cadastrados: 2, // B e E
      clientes_com_visita: 3, // A (2 dias), B (5 dias), C (3 dias)
      clientes_que_retornaram: 2, // A e C (B está na 1ª visita)
      visitas_de_retorno: 2,
      gasto_retorno_centavos: 4000 + 1500,
      total_visitas: 3,
      gasto_total_centavos: 4000 + 1000 + 1500,
      recompensas_resgatadas: 1,
    });
  });

  it("separado por plano", async () => {
    const mor = await metricas(null, "morador");
    const tur = await metricas(null, "turista");
    expect(mor).toMatchObject({ clientes_cadastrados: 3, clientes_que_retornaram: 2, total_visitas: 6 });
    expect(tur).toMatchObject({ clientes_cadastrados: 2, clientes_que_retornaram: 0, total_visitas: 1, gasto_total_centavos: 1000 });
  });

  it("visita corrigida conta com o valor corrigido", async () => {
    await comoSistema(db);
    await db.query("update visitas set valor_centavos = 100 where valor_centavos = 4000 and estabelecimento_id = $1", [ESTAB]);
    await comoUsuario(db, DONO);
    expect((await metricas(7)).gasto_retorno_centavos).toBe(100 + 1500);
  });
});
