import { Client } from "pg";

// Postgres do Supabase local (npx supabase start)
export const DB_URL =
  process.env.TEST_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

export async function conectar() {
  const db = new Client({ connectionString: DB_URL });
  await db.connect();
  return db;
}

/** Passa a agir como um usuário logado (mesmo mecanismo que o Supabase usa nas requisições). */
export async function comoUsuario(db: Client, userId: string) {
  await db.query("reset role");
  await db.query("select set_config('request.jwt.claims', $1, true)", [
    JSON.stringify({ sub: userId, role: "authenticated" }),
  ]);
  await db.query("set local role authenticated");
}

/** Passa a agir como visitante anônimo (chave pública, sem login). */
export async function comoAnonimo(db: Client) {
  await db.query("reset role");
  await db.query("select set_config('request.jwt.claims', $1, true)", [
    JSON.stringify({ role: "anon" }),
  ]);
  await db.query("set local role anon");
}

export async function comoSistema(db: Client) {
  await db.query("reset role");
}

/** Executa um comando que deve falhar, sem abortar a transação do teste. */
export async function deveFalhar(db: Client, sql: string, params: unknown[] = []) {
  await db.query("savepoint tentativa");
  try {
    await db.query(sql, params);
  } catch (erro) {
    await db.query("rollback to savepoint tentativa");
    return (erro as Error).message;
  }
  await db.query("release savepoint tentativa");
  throw new Error(`Era esperado que falhasse: ${sql}`);
}

/** Quantas linhas um comando afetou (para provar que o RLS filtrou tudo). */
export async function linhasAfetadas(db: Client, sql: string, params: unknown[] = []) {
  const r = await db.query(sql, params);
  return r.rowCount ?? 0;
}
