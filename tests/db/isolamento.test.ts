// Prova que um estabelecimento não enxerga nem altera os dados de outro.
// Requer o Supabase local rodando: `npx supabase start`.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Client } from "pg";
import { comoAnonimo, comoSistema, comoUsuario, conectar, deveFalhar, linhasAfetadas } from "./ajuda";

const ESTAB_A = "11111111-0000-4000-8000-00000000000a";
const ESTAB_B = "11111111-0000-4000-8000-00000000000b";
const DONO_A = "22222222-0000-4000-8000-00000000000a";
const DONO_B = "22222222-0000-4000-8000-00000000000b";
const ADMIN = "22222222-0000-4000-8000-0000000000ad";
const CLIENTE_A = "33333333-0000-4000-8000-00000000000a";
const CLIENTE_B = "33333333-0000-4000-8000-00000000000b";

let db: Client;

beforeAll(async () => {
  db = await conectar();
});
afterAll(async () => {
  await db.end();
});

// Cada teste roda numa transação desfeita no final: o banco fica sempre limpo.
beforeEach(async () => {
  await db.query("begin");
  await comoSistema(db);
  await db.query(
    `insert into auth.users (id, email) values ($1, 'a@t.test'), ($2, 'b@t.test'), ($3, 'adm@t.test')`,
    [DONO_A, DONO_B, ADMIN],
  );
  await db.query(
    `insert into estabelecimentos (id, slug, nome) values ($1, 'teste-a', 'Teste A'), ($2, 'teste-b', 'Teste B')`,
    [ESTAB_A, ESTAB_B],
  );
  await db.query(
    `insert into perfis (user_id, papel, estabelecimento_id) values
       ($1, 'dono', $3), ($2, 'dono', $4), ($5, 'super_admin', null)`,
    [DONO_A, DONO_B, ESTAB_A, ESTAB_B, ADMIN],
  );
  await db.query(
    `insert into clientes (id, estabelecimento_id, nome, telefone, codigo, plano_tipo) values
       ($1, $3, 'Ana A', '+5548999990001', 'K4827', 'morador'),
       ($2, $4, 'Bia B', '+5548999990002', 'K4827', 'turista')`,
    [CLIENTE_A, CLIENTE_B, ESTAB_A, ESTAB_B],
  );
  for (const [estab, cliente] of [[ESTAB_A, CLIENTE_A], [ESTAB_B, CLIENTE_B]]) {
    await db.query(
      `insert into visitas (estabelecimento_id, cliente_id, valor_centavos, gerou_carimbo, ciclo)
       values ($1, $2, 2000, true, 1)`,
      [estab, cliente],
    );
    await db.query(
      `insert into eventos_carimbo (estabelecimento_id, cliente_id, tipo, delta, saldo_apos, ciclo)
       values ($1, $2, 'visita', 1, 1, 1)`,
      [estab, cliente],
    );
    await db.query(`insert into passes (estabelecimento_id, cliente_id) values ($1, $2)`, [estab, cliente]);
    await db.query(
      `insert into consentimentos (estabelecimento_id, cliente_id, versao_texto) values ($1, $2, 1)`,
      [estab, cliente],
    );
    await db.query(
      `insert into campanhas (estabelecimento_id, texto, publico) values ($1, 'Oi', '{"tipo":"todos"}')`,
      [estab],
    );
    await db.query(
      `insert into envios (estabelecimento_id, cliente_id, origem, texto, status)
       values ($1, $2, 'personalizada', 'Oi', 'enviado')`,
      [estab, cliente],
    );
    await db.query(`insert into auditoria (estabelecimento_id, acao) values ($1, 'teste')`, [estab]);
  }
});

afterEach(async () => {
  await db.query("rollback");
});

const TABELAS_DO_ESTABELECIMENTO = [
  "planos",
  "clientes",
  "visitas",
  "eventos_carimbo",
  "passes",
  "automacoes",
  "campanhas",
  "envios",
  "auditoria",
];

describe("dono só enxerga o próprio estabelecimento", () => {
  it("vê apenas o seu estabelecimento", async () => {
    await comoUsuario(db, DONO_A);
    const r = await db.query("select id from estabelecimentos");
    expect(r.rows.map((l) => l.id)).toEqual([ESTAB_A]);
  });

  it.each(TABELAS_DO_ESTABELECIMENTO)("tabela %s: nenhuma linha de outro estabelecimento", async (tabela) => {
    await comoUsuario(db, DONO_A);
    const r = await db.query(`select distinct estabelecimento_id from ${tabela}`);
    expect(r.rows.length).toBeGreaterThan(0);
    expect(r.rows.map((l) => l.estabelecimento_id)).toEqual([ESTAB_A]);
  });

  it("não encontra cliente de outro estabelecimento nem buscando pelo id", async () => {
    await comoUsuario(db, DONO_A);
    const r = await db.query("select * from clientes where id = $1", [CLIENTE_B]);
    expect(r.rowCount).toBe(0);
  });

  it("não vê perfis de outros logins", async () => {
    await comoUsuario(db, DONO_A);
    const r = await db.query("select user_id from perfis");
    expect(r.rows.map((l) => l.user_id)).toEqual([DONO_A]);
  });

  it("não lê consentimentos nem dados técnicos do Wallet/Apple", async () => {
    await comoUsuario(db, DONO_A);
    for (const tabela of ["consentimentos", "dispositivos_apple", "registros_apple", "limites_requisicao"]) {
      expect(await deveFalhar(db, `select * from ${tabela}`)).toMatch(/permission denied/);
    }
  });
});

describe("dono não altera dados diretamente", () => {
  it("não insere clientes, visitas ou carimbos (nem no próprio estabelecimento)", async () => {
    await comoUsuario(db, DONO_A);
    expect(
      await deveFalhar(
        db,
        `insert into clientes (estabelecimento_id, nome, telefone, codigo, plano_tipo)
         values ($1, 'X', '+5548999990003', 'A1234', 'morador')`,
        [ESTAB_A],
      ),
    ).toMatch(/permission denied/);
    expect(
      await deveFalhar(
        db,
        `insert into eventos_carimbo (estabelecimento_id, cliente_id, tipo, delta, saldo_apos, ciclo)
         values ($1, $2, 'manual_mais', 1, 2, 1)`,
        [ESTAB_B, CLIENTE_B],
      ),
    ).toMatch(/permission denied/);
    expect(
      await deveFalhar(
        db,
        `insert into visitas (estabelecimento_id, cliente_id, valor_centavos, ciclo) values ($1, $2, 100, 1)`,
        [ESTAB_B, CLIENTE_B],
      ),
    ).toMatch(/permission denied/);
  });

  it("não edita nem apaga clientes, visitas ou carimbos de ninguém", async () => {
    await comoUsuario(db, DONO_A);
    for (const sql of [
      "update clientes set carimbos_atuais = 10",
      "delete from clientes",
      "update visitas set valor_centavos = 0",
      "delete from eventos_carimbo",
    ]) {
      expect(await deveFalhar(db, sql)).toMatch(/permission denied/);
    }
  });

  it("não edita as regras do programa (estabelecimento e planos)", async () => {
    await comoUsuario(db, DONO_A);
    expect(await linhasAfetadas(db, "update estabelecimentos set gasto_minimo_centavos = 0")).toBe(0);
    expect(await linhasAfetadas(db, "update planos set carimbos_meta = 1")).toBe(0);
    expect(await linhasAfetadas(db, "delete from estabelecimentos where id = $1", [ESTAB_B])).toBe(0);
    await comoSistema(db);
    const r = await db.query("select count(*)::int as n from planos where carimbos_meta = 1");
    expect(r.rows[0].n).toBe(0);
  });

  it("não se promove a super admin nem troca de estabelecimento", async () => {
    await comoUsuario(db, DONO_A);
    expect(
      await deveFalhar(db, `insert into perfis (user_id, papel) values ($1, 'super_admin')`, [DONO_B]),
    ).toMatch(/row-level security/);
    expect(
      await linhasAfetadas(db, "update perfis set estabelecimento_id = $1 where user_id = $2", [ESTAB_B, DONO_A]),
    ).toBe(0);
  });

  it("liga/desliga só as próprias automações", async () => {
    await comoUsuario(db, DONO_A);
    expect(
      await linhasAfetadas(db, "update automacoes set ativa_turista = true where estabelecimento_id = $1", [ESTAB_B]),
    ).toBe(0);
    expect(
      await linhasAfetadas(db, "update automacoes set ativa_turista = true where estabelecimento_id = $1", [ESTAB_A]),
    ).toBe(4);
  });
});

describe("visitante anônimo (chave pública)", () => {
  it("não lê nenhuma tabela", async () => {
    await comoAnonimo(db);
    for (const tabela of ["estabelecimentos", ...TABELAS_DO_ESTABELECIMENTO, "perfis", "consentimentos"]) {
      expect(await deveFalhar(db, `select * from ${tabela}`)).toMatch(/permission denied/);
    }
  });
});

describe("super admin", () => {
  it("vê todos os estabelecimentos e clientes", async () => {
    await comoUsuario(db, ADMIN);
    const e = await db.query("select count(*)::int as n from estabelecimentos where id in ($1, $2)", [ESTAB_A, ESTAB_B]);
    const c = await db.query("select count(*)::int as n from clientes where id in ($1, $2)", [CLIENTE_A, CLIENTE_B]);
    expect(e.rows[0].n).toBe(2);
    expect(c.rows[0].n).toBe(2);
  });

  it("edita regras de qualquer estabelecimento", async () => {
    await comoUsuario(db, ADMIN);
    expect(await linhasAfetadas(db, "update planos set carimbos_meta = 8 where estabelecimento_id = $1", [ESTAB_B])).toBe(2);
  });
});

describe("integridade", () => {
  it("registros de carimbo e auditoria são imutáveis, até para o sistema", async () => {
    await comoSistema(db);
    expect(await deveFalhar(db, "update eventos_carimbo set delta = 5")).toMatch(/imutável/);
    expect(await deveFalhar(db, "delete from auditoria")).toMatch(/imutável/);
  });

  it("não liga uma visita a um cliente de outro estabelecimento", async () => {
    await comoSistema(db);
    expect(
      await deveFalhar(
        db,
        `insert into visitas (estabelecimento_id, cliente_id, valor_centavos, ciclo) values ($1, $2, 100, 1)`,
        [ESTAB_A, CLIENTE_B],
      ),
    ).toMatch(/foreign key/);
  });

  it("código do cartão não aceita O, I nem L", async () => {
    await comoSistema(db);
    for (const codigo of ["O1234", "I1234", "L1234", "k1234", "K123"]) {
      await deveFalhar(
        db,
        `insert into clientes (estabelecimento_id, nome, telefone, codigo, plano_tipo)
         values ($1, 'X', '+5548999990009', $2, 'morador')`,
        [ESTAB_A, codigo],
      );
    }
  });

  it("telefone é único por estabelecimento, mas pode repetir entre estabelecimentos", async () => {
    await comoSistema(db);
    expect(
      await deveFalhar(
        db,
        `insert into clientes (estabelecimento_id, nome, telefone, codigo, plano_tipo)
         values ($1, 'Outra', '+5548999990001', 'B2222', 'morador')`,
        [ESTAB_A],
      ),
    ).toMatch(/duplicate key/);
    await db.query(
      `insert into clientes (estabelecimento_id, nome, telefone, codigo, plano_tipo)
       values ($1, 'Ana em B', '+5548999990001', 'B2222', 'morador')`,
      [ESTAB_B],
    );
  });

  it("estabelecimento novo nasce com os planos e automações padrão", async () => {
    await comoSistema(db);
    const p = await db.query(
      "select tipo, carimbos_meta, recompensa_texto from planos where estabelecimento_id = $1 order by tipo",
      [ESTAB_A],
    );
    expect(p.rows).toEqual([
      { tipo: "morador", carimbos_meta: 10, recompensa_texto: "1 prato" },
      { tipo: "turista", carimbos_meta: 5, recompensa_texto: "1 sobremesa" },
    ]);
    const a = await db.query(
      "select ativa_turista from automacoes where estabelecimento_id = $1 and tipo = 'sentimos_falta'",
      [ESTAB_A],
    );
    expect(a.rows[0].ativa_turista).toBe(false);
  });

  it("slugs reservados pelo sistema são recusados", async () => {
    await comoSistema(db);
    expect(
      await deveFalhar(db, "insert into estabelecimentos (slug, nome) values ('painel', 'X')"),
    ).toMatch(/check constraint/);
  });
});
