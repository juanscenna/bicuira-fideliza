// Cadastro público: telefone duplicado, código do cartão, planos e limite de requisições.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Client } from "pg";
import { comoAnonimo, comoSistema, comoUsuario, conectar, deveFalhar } from "./ajuda";

const ESTAB = "44444444-0000-4000-8000-00000000000a";
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
  await db.query(`insert into estabelecimentos (id, slug, nome) values ($1, 'cadastro-teste', 'Cadastro Teste')`, [ESTAB]);
});
afterEach(async () => {
  await db.query("rollback");
});

async function cadastrar(nome: string, telefone: string, plano = "morador", slug = "cadastro-teste") {
  const r = await db.query("select cadastrar_cliente($1, $2, $3, $4, 'ip') as r", [slug, nome, telefone, plano]);
  return r.rows[0].r as { status: string; token?: string; codigo?: string };
}

describe("cadastro de cliente", () => {
  it("cria cliente, cartão (pass), consentimento e auditoria", async () => {
    const r = await cadastrar("Ana", "+5548999990001");
    expect(r.status).toBe("criado");
    expect(r.token).toMatch(/^[0-9a-f]{48}$/);
    expect(r.codigo).toMatch(/^[A-HJKMNP-Z][0-9]{4}$/);
    const c = await db.query("select id, plano_tipo, carimbos_atuais from clientes where token_cartao = $1", [r.token]);
    expect(c.rows[0]).toMatchObject({ plano_tipo: "morador", carimbos_atuais: 0 });
    const extras = await db.query(
      `select (select count(*) from passes where cliente_id = $1)::int as passes,
              (select count(*) from consentimentos where cliente_id = $1 and versao_texto = 1)::int as consent,
              (select count(*) from auditoria where alvo_id = $1::text and acao = 'cliente.cadastro')::int as audit`,
      [c.rows[0].id],
    );
    expect(extras.rows[0]).toEqual({ passes: 1, consent: 1, audit: 1 });
  });

  it("telefone já cadastrado devolve o mesmo cartão, sem duplicar e sem mudar o nome", async () => {
    const a = await cadastrar("Ana", "+5548999990001");
    const b = await cadastrar("Outra Pessoa", "+5548999990001", "turista");
    expect(b).toEqual({ status: "existente", token: a.token, codigo: a.codigo });
    const c = await db.query("select nome, plano_tipo from clientes where estabelecimento_id = $1", [ESTAB]);
    expect(c.rows).toEqual([{ nome: "Ana", plano_tipo: "morador" }]);
  });

  it("o mesmo telefone pode ter cartões em estabelecimentos diferentes", async () => {
    await db.query(`insert into estabelecimentos (slug, nome) values ('outro-lugar', 'Outro')`);
    const a = await cadastrar("Ana", "+5548999990001");
    const b = await cadastrar("Ana", "+5548999990001", "morador", "outro-lugar");
    expect(b.status).toBe("criado");
    expect(b.token).not.toBe(a.token);
  });

  it("estabelecimento inativo ou inexistente não cadastra", async () => {
    expect((await cadastrar("Ana", "+5548999990001", "morador", "nao-existe")).status).toBe("nao_encontrado");
    await db.query("update estabelecimentos set ativo = false where id = $1", [ESTAB]);
    expect((await cadastrar("Ana", "+5548999990001")).status).toBe("inativo");
  });

  it("recusa plano desativado; com um só plano ativo usa esse", async () => {
    await db.query("update planos set ativo = false where estabelecimento_id = $1 and tipo = 'turista'", [ESTAB]);
    const r = await cadastrar("Bia", "+5548999990002", "turista");
    expect(r.status).toBe("criado");
    const c = await db.query("select plano_tipo from clientes where token_cartao = $1", [r.token]);
    expect(c.rows[0].plano_tipo).toBe("morador");
    await db.query("update planos set ativo = true where estabelecimento_id = $1", [ESTAB]);
    expect((await cadastrar("Cris", "+5548999990003", "vip")).status).toBe("plano_invalido");
  });

  it("gera códigos únicos, sem O, I e L", async () => {
    const codigos = new Set<string>();
    for (let i = 0; i < 300; i++) {
      const r = await db.query("select gerar_codigo_cartao($1) as c", [ESTAB]);
      const c = r.rows[0].c as string;
      expect(c).toMatch(/^[A-HJKMNP-Z][0-9]{4}$/);
      codigos.add(c);
    }
    for (let i = 0; i < 40; i++) await cadastrar(`Cliente ${i}`, `+55489999${String(10000 + i).slice(1)}0`.slice(0, 14));
    const r = await db.query("select count(*)::int as n, count(distinct codigo)::int as d from clientes where estabelecimento_id = $1", [ESTAB]);
    expect(r.rows[0].n).toBe(r.rows[0].d);
  });

  it("público e donos não chamam o cadastro direto", async () => {
    await comoAnonimo(db);
    expect(await deveFalhar(db, "select cadastrar_cliente('cadastro-teste', 'X', '+5548999990009', 'morador', null)")).toMatch(/permission denied/);
    await comoUsuario(db, "00000000-0000-4000-8000-000000000000");
    expect(await deveFalhar(db, "select consumir_limite('x', 1, 60)")).toMatch(/permission denied/);
  });
});

describe("limite de requisições", () => {
  it("bloqueia depois do máximo na mesma janela", async () => {
    const resultados = [];
    for (let i = 0; i < 4; i++) {
      const r = await db.query("select consumir_limite('teste:ip', 3, 600) as ok");
      resultados.push(r.rows[0].ok);
    }
    expect(resultados).toEqual([true, true, true, false]);
  });
});
