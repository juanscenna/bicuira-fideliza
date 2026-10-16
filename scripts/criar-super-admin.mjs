// Cria (ou promove) o login de super admin da Bicuíra num projeto Supabase.
// Uso (no seu computador, com as chaves do projeto de produção):
//   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SECRET_KEY=... \
//   node scripts/criar-super-admin.mjs voce@bicuira.com.br "uma-senha-forte"
import { createClient } from "@supabase/supabase-js";

const [email, senha] = process.argv.slice(2);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const chave = process.env.SUPABASE_SECRET_KEY;

if (!email || !senha || !url || !chave) {
  console.error("Uso: NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SECRET_KEY=... node scripts/criar-super-admin.mjs <email> <senha>");
  process.exit(1);
}
if (senha.length < 10) {
  console.error("Use uma senha com pelo menos 10 caracteres.");
  process.exit(1);
}

const supabase = createClient(url, chave, { auth: { persistSession: false } });

let userId;
const { data: criado, error } = await supabase.auth.admin.createUser({ email, password: senha, email_confirm: true });
if (error) {
  // já existe? procura pelo e-mail
  const { data: lista } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  userId = lista?.users.find((u) => u.email === email.toLowerCase())?.id;
  if (!userId) {
    console.error("Não foi possível criar o login:", error.message);
    process.exit(1);
  }
  console.log("Login já existia; promovendo a super admin.");
} else {
  userId = criado.user.id;
}

const { error: erroPerfil } = await supabase
  .from("perfis")
  .upsert({ user_id: userId, papel: "super_admin", estabelecimento_id: null });
if (erroPerfil) {
  console.error("Erro ao gravar o perfil:", erroPerfil.message);
  process.exit(1);
}
console.log(`Pronto: ${email} é super admin. Entre em /entrar.`);
