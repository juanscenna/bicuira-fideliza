# Publicar o piloto (sem terminal)

Tudo pelo navegador: Supabase (banco) + Vercel (site). No piloto o cartão do cliente é **só a página web**; os botões de Wallet ficam escondidos (variável `WALLET_ATIVO`, ver o fim deste guia).

> Chaves secretas vão **somente** nas variáveis da Vercel. Não cole em chat, e-mail ou no código.

---

## Parte 1: Supabase

### 1.1 Criar as tabelas

1. Abra o projeto `bicuira-fideliza` no Supabase.
2. Menu da esquerda: **SQL Editor** → **New query**.
3. No GitHub, abra o arquivo `supabase/producao.sql` deste repositório, clique em **Raw**, copie tudo e cole no editor.
4. Clique em **Run**. Deve aparecer *Success. No rows returned*.

Rode só uma vez. Se rodar de novo, vai dar erro de "already exists" (não estraga nada).

### 1.2 Bloquear cadastro de logins por conta própria

**Authentication → Sign In / Providers**:
- desligue **Allow new users to sign up**;
- deixe o provedor **Email** ligado.

### 1.3 Criar o seu login de administrador

1. **Authentication → Users → Add user → Create new user**.
2. Seu e-mail e uma senha forte, com **Auto Confirm User** marcado.
3. Volte ao **SQL Editor** e rode (trocando o e-mail):

```sql
insert into public.perfis (user_id, papel)
select id, 'super_admin' from auth.users where email = 'seu-email@exemplo.com';
```

Deve aparecer *1 row* (ou *Success*).

### 1.4 Anotar 3 valores

Em **Project Settings → API Keys** (se só aparecerem as chaves "legacy", clique para criar as novas):

| Nome na Vercel | Onde achar | É secreto? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **Project URL** (botão **Connect** no topo, ou *Project Settings → Data API*), ex.: `https://abcd.supabase.co` | não |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | **Publishable key** (`sb_publishable_…`) | não |
| `SUPABASE_SECRET_KEY` | **Secret key** (`sb_secret_…`), botão de revelar/copiar | **sim** |

---

## Parte 2: Vercel

### 2.1 Importar o projeto

1. Na Vercel: **Add New → Project**.
2. Escolha o repositório **juanscenna/bicuira-fideliza** (se não aparecer, clique em *Adjust GitHub App Permissions* e libere o repositório).
3. A Vercel reconhece **Next.js** sozinha. Não mude os comandos.

### 2.2 Variáveis de ambiente

Ainda na tela de importação, abra **Environment Variables** e cadastre:

| Nome | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | do passo 1.4 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | do passo 1.4 |
| `SUPABASE_SECRET_KEY` | do passo 1.4 |
| `SEGREDO_HASH` | um texto aleatório longo (ex.: gere uma senha de 40 caracteres no seu gerenciador de senhas) |
| `CRON_SECRET` | outro texto aleatório longo, diferente do anterior |
| `WALLET_ATIVO` | `false` |
| `NEXT_PUBLIC_SITE_URL` | deixe para o passo 2.3 |

Clique em **Deploy** e espere terminar (uns 2 minutos).

### 2.3 Endereço do site

1. Depois do deploy, copie o endereço que a Vercel deu (ex.: `https://bicuira-fideliza.vercel.app`).
2. **Settings → Environment Variables**: crie `NEXT_PUBLIC_SITE_URL` com esse endereço (sem barra no final).
3. **Deployments** → nos **⋯** do último deploy → **Redeploy**. (Esse endereço vai dentro do QR Code, por isso precisa do novo deploy.)

Quando o domínio `fideliza.bicuira.com.br` estiver configurado na Vercel, troque `NEXT_PUBLIC_SITE_URL` por ele e faça **Redeploy** de novo. Os QR Codes impressos antes disso apontam para o endereço antigo: imprima depois de definir o endereço final.

---

## Parte 3: Primeiro teste

1. Abra `SEU-ENDERECO/entrar` e entre com o login do passo 1.3. Você cai no **/admin**.
2. **Novo estabelecimento** → "Restaurante Teste" (os padrões já vêm preenchidos) → **Criar**.
3. Na página dele: crie o **login do dono** e baixe o **QR Code**.
4. No celular, escaneie o QR, cadastre-se e deixe o cartão aberto.
5. No computador, abra `SEU-ENDERECO/entrar` numa janela anônima, entre como dono e registre uma visita pelo código ou pelo leitor de QR. O cartão no celular atualiza sozinho.

Se o cartão demorar até 30 segundos para atualizar (em vez de na hora), o tempo real do Supabase está bloqueado: em **Project Settings → Realtime**, deixe permitido o acesso público aos canais. O cartão funciona de qualquer forma, só que mais devagar.

---

## Depois (opcional)

- **Mensagens agendadas na hora certa:** seção "Tarefas agendadas" do README (pg_cron). Sem isso, a Vercel roda as automáticas e as agendadas vencidas uma vez por dia (11h).
- **Ligar o Wallet:** configure as contas (`docs/SETUP-WALLET.md`), cadastre as variáveis da Apple/Google, mude `WALLET_ATIVO` para `true` e faça **Redeploy**. Não precisa mudar código.
- **Mudou alguma tabela no código?** Rode `node scripts/gerar-sql-producao.mjs` para atualizar o `supabase/producao.sql` (projetos já publicados recebem só a migration nova, pelo SQL Editor).
