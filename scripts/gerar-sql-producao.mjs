// Junta todas as migrations num único arquivo para colar no SQL Editor do Supabase
// (alternativa ao `supabase db push` para quem não usa terminal).
// Uso: node scripts/gerar-sql-producao.mjs
import { readdirSync, readFileSync, writeFileSync } from "node:fs";

const pasta = "supabase/migrations";
const arquivos = readdirSync(pasta).filter((f) => f.endsWith(".sql")).sort();
const partes = arquivos.map((f) => `-- ===== ${f} =====\n${readFileSync(`${pasta}/${f}`, "utf8").trim()}\n`);
const cabecalho = `-- Bicuíra Fideliza — estrutura completa do banco (gerado por scripts/gerar-sql-producao.mjs).
-- Cole tudo no Supabase → SQL Editor → Run, UMA vez, num projeto novo.
-- Não contém dados de teste nem logins.

`;
writeFileSync("supabase/producao.sql", cabecalho + partes.join("\n"));
console.log(`supabase/producao.sql gerado com ${arquivos.length} migrations.`);
