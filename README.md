# Bicuíra Fideliza

Cartão fidelidade digital para restaurantes e bares, criado pela Bicuíra Digital.

- **Cliente:** escaneia o QR Code, se cadastra e recebe o cartão (Apple Wallet, Google Wallet ou cartão web).
- **Dono:** registra visitas, carimbos e resgates no `/painel`.
- **Bicuíra:** cria e configura estabelecimentos no `/admin`.

Documentos:
- `prompt-bicuira-fideliza.md`: especificação do piloto
- `docs/PLANO.md`: plano, telas, modelo de dados e ordem de construção
- `docs/DECISOES.md`: decisões tomadas no caminho

> **Andamento:** etapas 1 a 4 concluídas (base, admin, cadastro + cartão web, painel do dono). Próximas: métricas, Wallet e notificações.

---

## Rodar no seu computador

Você precisa de: **Node.js 22**, **Docker Desktop** (aberto) e **Git**.

```bash
npm install
npm run db:iniciar        # sobe um Supabase local no Docker (a primeira vez demora alguns minutos)
cp .env.example .env.local
```

Preencha o `.env.local` com os valores que o `npm run db:iniciar` mostra no final:

| Variável | Valor local |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `http://127.0.0.1:54321` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | o valor de **Publishable key** |
| `SUPABASE_SECRET_KEY` | o valor de **Secret key** |
| `SEGREDO_HASH` | qualquer texto (local) |

```bash
npm run db:resetar        # cria as tabelas e os dados de teste
npm run dev               # abre em http://localhost:3000
```

### Logins de teste (só no ambiente local)

| Perfil | E-mail | Senha |
|---|---|---|
| Super admin | `admin@bicuira.test` | `bicuira-admin-local` |
| Dono do Restaurante Teste | `dono@restaurante-teste.test` | `restaurante-teste-local` |

Esses logins só existem no banco local, criados por `supabase/seed.sql`, junto com o **Restaurante Teste** e **20 clientes fictícios** com visitas variadas. Nunca rode o seed em produção.

Para testar como cliente: abra `http://localhost:3000/restaurante-teste` (de preferência no celular, na mesma rede) e cadastre-se.

### Testes

```bash
npm test                  # regras de negócio + isolamento entre estabelecimentos
```

Os testes de banco precisam do Supabase local rodando (`npm run db:iniciar`).

---

## Publicar (Supabase + Vercel)

### 1. Supabase (banco de dados)

1. Crie um projeto em [supabase.com](https://supabase.com) na região **South America (São Paulo)**.
2. **Desligue o autocadastro:** *Authentication → Sign In / Providers* → desligue **Allow new users to sign up**. Deixe o provedor **Email** ligado.
3. Envie as tabelas para o projeto (no seu computador):
   ```bash
   npx supabase login
   npx supabase link --project-ref <id-do-projeto>   # o id aparece na URL do painel
   npx supabase db push
   ```
4. Crie o seu login de super admin:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://<id>.supabase.co SUPABASE_SECRET_KEY=<chave secreta> \
   node scripts/criar-super-admin.mjs voce@bicuira.com.br "uma-senha-forte"
   ```

### 2. Vercel (site)

1. Na Vercel: **Add New → Project** e importe o repositório `bicuira-fideliza`.
2. Em **Environment Variables**, cadastre as variáveis do `.env.example`, com os valores do projeto Supabase (*Project Settings → API Keys*) e `NEXT_PUBLIC_SITE_URL` com o endereço final.
3. Clique em **Deploy**.

> A chave secreta (`SUPABASE_SECRET_KEY`) só vai nas variáveis da Vercel. Nunca no código nem em mensagens.

---

## Criar um novo estabelecimento

1. Entre em `/entrar` com o login de super admin. Você cai em `/admin`.
2. **Novo estabelecimento:** preencha nome (o endereço é sugerido sozinho), logo, cores, planos e gasto mínimo. A prévia do cartão mostra o resultado.
3. Na página do estabelecimento:
   - **Login do dono:** e-mail e senha inicial. Passe ao dono pessoalmente.
   - **QR Code:** baixe o PDF (A5, pronto para imprimir) ou o PNG.
4. O dono entra em `/entrar` com o login dele e cai em `/painel`.

## Configurar o Apple Wallet e o Google Wallet

Chega na etapa 6 (guia em `docs/SETUP-WALLET.md`).
