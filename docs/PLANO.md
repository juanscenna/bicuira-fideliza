# Bicuíra Fideliza — Plano do piloto

> Status: **etapa 1 concluída**. Próxima: etapa 2.
> Fonte: `prompt-bicuira-fideliza.md`.

---

## 1. Em uma frase

Um único sistema Next.js + Supabase que atende vários restaurantes. O cliente se cadastra pelo QR Code e recebe um cartão (Wallet ou web). O dono opera tudo num painel pensado para **registrar uma visita em menos de 5 segundos**.

---

## 2. Experiência de uso (UX) — o mais importante

### 2.1 Princípios

| Princípio | Na prática |
|---|---|
| **Uma tela, uma tarefa** | Cada tela tem **um** botão principal, grande e na cor Lima. O resto é secundário. |
| **Polegar primeiro** | No celular, as ações ficam na metade de baixo da tela. Botões com pelo menos 48 px de altura. |
| **Falar como gente** | "Registrar visita", "Resgatar recompensa", "Clientes que retornaram". Nunca "token", "objeto", "evento". |
| **Sempre dizer o que aconteceu** | Toda ação mostra um aviso curto: "✓ Visita registrada — Ana agora tem 7 de 10". |
| **Errou? Desfaz** | +1/−1 carimbo e registro de visita têm **"Desfazer"** por 10 s, sem janela de "tem certeza?" que atrasa o caixa. |
| **Confirmar só o irreversível** | Só pedem confirmação: **Resgatar**, **Trocar plano** e (no admin) **Excluir dados do cliente**. |
| **Teclado certo** | Valor abre teclado numérico (`inputmode="decimal"`); telefone abre teclado de telefone; código do cartão aceita minúsculas e converte. |

### 2.2 Painel do dono (`/painel`): o fluxo do caixa

**Navegação:** 4 itens apenas → **Início · Clientes · Métricas · Avisos**.
Barra fixa embaixo no celular; barra lateral no computador.

**Fluxo principal: registrar visita (meta: 3 toques, ~5 s)**

```
┌─────────────────────────────┐     ┌─────────────────────────────┐     ┌─────────────────────────────┐
│ INÍCIO                      │     │ ANA SOUZA · K4827 · Morador │     │  ✓ Visita registrada        │
│                             │     │ ●●●●●●○○○○   6 de 10        │     │                             │
│ Código do cartão            │ ──► │                             │ ──► │  ●●●●●●●○○○  7 de 10        │
│ [ K4827        ]  (grande)  │     │ Valor gasto                 │     │  Faltam 3 para: 1 prato     │
│                             │     │ [ R$ 42,00 ]  ✓ gera carimbo│     │                             │
│ [📷 Escanear QR Code ]      │     │ + descrição (opcional)      │     │ [ Próximo cliente ]  (Lima) │
│                             │     │                             │     │  Desfazer · Ver ficha       │
│ Hoje: 12 visitas · R$ 480   │     │ [ Registrar visita ] (Lima) │     │                             │
└─────────────────────────────┘     └─────────────────────────────┘     └─────────────────────────────┘
```

- O campo de código já vem com o cursor nele (no computador). Ao completar 5 caracteres válidos, abre a ficha sozinho, sem precisar de Enter.
- Ao escanear o QR, a ficha abre direto com o cursor no **valor**.
- Enquanto o dono digita o valor, o sistema avisa na hora: **"✓ Gera carimbo"** ou **"Abaixo do mínimo de R$ 15,00, será registrada sem carimbo"**.
- Com o cartão cheio, o topo da ficha mostra uma faixa grande: **"Recompensa disponível: resgatar agora"**, e o botão de resgate passa a ser o principal.
- "Próximo cliente" volta ao Início com o campo limpo e focado.

**Ficha do cliente.** Ordem de importância, de cima para baixo:
1. Nome, código, plano (com "trocar" discreto ao lado)
2. Carimbos em bolinhas + "7 de 10" + recompensa
3. Ações: **Registrar visita** (principal) · +1 · −1 · Resgatar (aparece só com cartão cheio)
4. Histórico em linha do tempo única (visitas, carimbos, resgates, trocas de plano), com "editar" em cada visita

**Clientes.** Busca única no topo ("nome, telefone ou código"), filtros como chips (Moradores · Turistas · Perto da recompensa · Recompensa disponível · Inativos) e ordenação num menu simples. No celular, cada cliente aparece como linha com nome, progresso e última visita. No computador, como tabela.

**Métricas.** Dois seletores no topo: período (**7 d · 30 d · 90 d · Tudo**) e público (**Todos · Moradores · Turistas**). Abaixo, números grandes em blocos, cada um com uma frase explicando o que é. Rodapé fixo: *"Valores registrados no painel. Não representam o faturamento do restaurante."* Sem gráficos complexos no piloto; no máximo um gráfico de barras simples de visitas por dia.

**Avisos (notificações).** Assistente em 4 passos curtos:
**Mensagem** (com contador de caracteres) → **Para quem** (mostra "42 clientes" ao vivo) → **Quando** (agora / agendar) → **Revisar** ("Será enviado para 42 clientes. 3 serão pulados porque já receberam 2 mensagens esta semana."). As automáticas aparecem como lista de interruptores, cada uma com uma frase explicando quando dispara. O status mostrado é sempre **"enviado"**, nunca "entregue".

### 2.3 Cadastro público (`/{slug}`) e cartão web

- **Uma única tela**: nome → telefone → *"Você é morador da região ou está de visita?"* (dois botões grandes, sem mostrar regras) → consentimento (caixa com área de toque grande) → **"Criar meu cartão"**.
- Erros aparecem **embaixo do campo**, em linguagem simples ("Confira o número: precisa ter DDD + 9 dígitos").
- Depois do cadastro: prévia do cartão + botões **Apple Wallet** e **Google Wallet**. O mais adequado ao aparelho aparece primeiro e maior. Abaixo: "Salvar este cartão na tela inicial" com instruções de 2 passos para iPhone ou Android.
- **Cartão web**: proporção de cartão Wallet; cabeçalho com logo e nome; carimbos como ícones grandes; nome do cliente; recompensa; QR Code com o código ao lado. Ocupa a tela do celular. Carimbo novo tem uma animação curta, desligada com `prefers-reduced-motion`. Mensagens aparecem como faixa no topo.
- **Cores do estabelecimento**: a cor do texto sobre a cor do restaurante é escolhida **automaticamente** (claro ou escuro, pelo contraste), para que nenhuma cor configurada deixe o cartão ilegível.

### 2.4 Admin (`/admin`)

Lista de estabelecimentos (nome, status, nº de clientes). Ficha do estabelecimento em seções com títulos claros: **Identidade · Planos e regras · Login do dono · QR Code · Cobrança (informativo) · Dados de clientes (LGPD)**. O seletor de cor mostra uma prévia do cartão ao lado e avisa se o contraste ficar ruim.

### 2.5 Marca Bicuíra nos painéis (contraste já verificado)

| Uso | Combinação | Contraste |
|---|---|---|
| Texto padrão | Carvão sobre Areia | 12,2 : 1 ✓ |
| Cabeçalho / barra de navegação | Areia sobre Restinga | 9,1 : 1 ✓ |
| **Botão principal (ação)** | Carvão sobre **Lima** | 8,1 : 1 ✓ |
| Botão secundário | Contorno Restinga, texto Restinga | 9,1 : 1 ✓ |
| Destaque/alerta (Pôr do Sol) | Só ícones, bordas e números ≥ 24 px | 3,6 : 1 (só para texto grande) |
| Oceano | Só elementos gráficos (gráfico, ícones) | 3,3 : 1 (não usar em texto pequeno) |

Fontes: **Baloo 2 ExtraBold** nos títulos e **Sora** no resto, via `next/font`. Ícones: Lucide (SVG). Texto nunca abaixo de 14 px no painel. Foco do teclado sempre visível.

---

## 3. Estrutura de pastas

```
bicuira-fideliza/
├─ src/
│  ├─ app/
│  │  ├─ [slug]/                      # página pública de cadastro
│  │  │  ├─ page.tsx
│  │  │  ├─ privacidade/page.tsx      # política gerada por modelo
│  │  │  ├─ manifest.webmanifest/     # manifest com nome/ícone do estabelecimento
│  │  │  └─ cartao/[token]/page.tsx   # cartão web (fallback do Wallet)
│  │  ├─ painel/                      # dono: início, clientes, clientes/[id], metricas, avisos
│  │  ├─ admin/                       # super admin: estabelecimentos, [id], novo
│  │  ├─ entrar/                      # login (e-mail + senha)
│  │  └─ api/
│  │     ├─ cadastro/route.ts         # rate limit + honeypot
│  │     ├─ cartao/[token]/route.ts   # dados atuais do cartão web
│  │     ├─ wallet/apple/v1/...       # web service oficial de passes da Apple
│  │     ├─ wallet/apple/pass/[token] # download .pkpass
│  │     ├─ wallet/google/salvar/[token]
│  │     └─ cron/{inatividade,agendadas,esquecidas}/route.ts
│  ├─ lib/
│  │  ├─ supabase/                    # clientes browser / servidor / service (server-only)
│  │  ├─ dominio/                     # regras puras: código, telefone, métricas, limites
│  │  ├─ wallet/{apple,google,index}.ts  # "modo teste" quando faltam credenciais
│  │  ├─ notificacoes/
│  │  ├─ auditoria.ts
│  │  └─ tema.ts                      # cores do estabelecimento → variáveis CSS + contraste
│  ├─ components/                     # ui/ (botões, campos), painel/, cartao/
│  └─ middleware.ts                   # sessão + (futuro) domínio próprio → estabelecimento
├─ supabase/
│  ├─ migrations/                     # tabelas, RLS, funções SQL
│  └─ seed.sql                        # Restaurante Teste + dono + ~20 clientes
├─ tests/
│  ├─ unit/                           # regras puras (Vitest)
│  └─ db/                             # regras + isolamento contra Postgres local
├─ docs/  PLANO.md · DECISOES.md · SETUP-WALLET.md
├─ .env.example · vercel.json · README.md
```

Slugs reservados (não podem ser usados por estabelecimentos): `painel`, `admin`, `entrar`, `api`, `_next`, entre outros.

---

## 4. Modelo de dados

```
estabelecimentos ─┬─< planos               (morador / turista, meta de carimbos, recompensa)
                  ├─< perfis               (usuário Auth → papel + estabelecimento)
                  ├─< automacoes           (4 automáticas, liga/desliga, público)
                  └─< clientes ─┬─< visitas
                                ├─< eventos_carimbo   (imutável)
                                ├─< consentimentos
                                ├── passes ──< registros_apple >── dispositivos_apple
                                └─< envios >── campanhas
auditoria · limites_requisicao
```

| Tabela | Campos principais | Observações |
|---|---|---|
| **estabelecimentos** | id, slug (único), nome, logo_path, cor_primaria, cor_secundaria, gasto_minimo_centavos (1500), dias_inatividade (30), max_personalizadas_semana (2), ativo, cobranca_plano, cobranca_status, cobranca_vencimento, versao_politica | Dinheiro sempre em **centavos inteiros** |
| **planos** | id, estabelecimento_id, tipo (`morador`/`turista`), ativo, carimbos_meta, recompensa_texto | Único (estabelecimento, tipo) |
| **perfis** | user_id (→ auth.users), papel (`super_admin`/`dono`), estabelecimento_id (nulo para super admin) | Hoje 1 dono por estabelecimento; o modelo já aceita vários |
| **clientes** | id, estabelecimento_id, nome, telefone_e164, codigo, plano_tipo, carimbos_atuais, ciclo, recompensa_desde, token_cartao, anonimizado_em, criado_em | Únicos: (estab., telefone), (estab., código), token. `carimbos_atuais` é um cache do registro de eventos |
| **visitas** | id, estabelecimento_id, cliente_id, valor_centavos, descricao, gerou_carimbo, ciclo, registrado_por, criado_em, editado_em | |
| **eventos_carimbo** | id, estabelecimento_id, cliente_id, tipo (`visita`, `manual_mais`, `manual_menos`, `resgate`, `troca_plano`, `ajuste_edicao`, `desfazer`), delta, saldo_apos, visita_id, motivo, dados (json), criado_em | **Só inserção** (sem update/delete). Pronto para futura expiração e antifraude |
| **consentimentos** | cliente_id, versao_texto, aceito_em, ip_hash | LGPD |
| **passes** | cliente_id, serial, auth_token_apple, google_object_id, versao, atualizado_em, mensagem_atual | |
| **dispositivos_apple / registros_apple** | device_library_id, push_token / device ↔ pass | Web service da Apple |
| **campanhas** | id, estabelecimento_id, texto, publico (json), agendada_para, status, criada_por | |
| **envios** | campanha_id ou automacao, cliente_id, canal (`apple`/`google`/`web`), status (`enviado`/`pulado`/`falhou`), motivo, criado_em | Base do limite de frequência |
| **automacoes** | estabelecimento_id, tipo (`falta_pouco`, `recompensa_disponivel`, `sentimos_falta`, `recompensa_esquecida`), ativa_morador, ativa_turista | Padrões da seção 6 do prompt |
| **auditoria** | estabelecimento_id, user_id, acao, alvo, antes, depois, user_agent, ip_hash, criado_em | Só inserção |
| **limites_requisicao** | chave (ip_hash + rota), janela, contagem | Limite do formulário público sem Redis |

**Regras de negócio no banco:** as operações sensíveis (`registrar_visita`, `ajustar_carimbos`, `resgatar`, `trocar_plano`, `editar_visita`, `cadastrar_cliente`) são **funções SQL transacionais** com trava de linha. Assim, dois cliques no caixa não dão carimbo duplicado e o total nunca fica negativo nem passa do máximo. O dono só **lê** as tabelas; as alterações passam por essas funções, que conferem o estabelecimento do login (ver `docs/DECISOES.md`).

---

## 5. Segurança e RLS

Funções auxiliares: `eh_super_admin()` e `meu_estabelecimento()` (leem `perfis` do usuário logado).

| Tabela | Super admin | Dono | Anônimo (público) |
|---|---|---|---|
| estabelecimentos | tudo | **ler** só o seu | nada (página pública lê pelo servidor, só campos públicos) |
| planos | tudo | ler os seus | nada |
| perfis | tudo | ler o próprio | nada |
| clientes, visitas | tudo | **ler** onde `estabelecimento_id = meu_estabelecimento()`; alterações só pelas funções do banco | nada |
| eventos_carimbo, auditoria | ler | ler os seus; **ninguém altera nem apaga** (gatilho bloqueia) | nada |
| campanhas, envios, automacoes | tudo | os seus (automacoes: só ligar/desligar) | nada |
| passes, dispositivos/registros Apple, consentimentos, limites | ler | ler os seus (passes) | nada; só o servidor (chave de serviço) |

- O dono **não** edita regras: sem `update` em `estabelecimentos`/`planos`.
- Cadastro público, cartão web e Wallet passam por **rotas do servidor** que validam slug/token. A chave de serviço fica num módulo `server-only`.
- **Tempo real do cartão web**: cada cartão escuta um canal Realtime *broadcast* com nome derivado do token secreto. O servidor só envia "atualizou"; o cartão então busca os dados pela rota com o token. Nenhum dado de cliente trafega pelo canal.
- **Testes de isolamento**: dois estabelecimentos e dois donos; provar que o dono A não lê, não altera e não chama funções sobre dados de B (em todas as tabelas).

---

## 6. Ordem de construção (paro ao fim de cada etapa)

| # | Etapa | Ao final você consegue |
|---|---|---|
| 1 | Base: Next.js, Tailwind (marca), Supabase, migrations, Auth, perfis, RLS, testes de isolamento | Entrar como super admin e como dono; rodar os testes |
| 2 | Admin + "Restaurante Teste" + QR Code (PNG e PDF) | Criar/editar estabelecimento, criar login do dono, baixar o QR |
| 3 | Cadastro público + cartão web (tempo real, manifest, política de privacidade) | Escanear o QR, cadastrar-se, ver o cartão no celular |
| 4 | Painel do dono: busca, leitor de QR, ficha, visitas, carimbos, resgate, troca de plano, edição de visita | **Primeiro marco**: o fluxo completo com o cartão se atualizando sozinho |
| 5 | Métricas | Ver os indicadores por período e por plano |
| 6 | Apple + Google Wallet com modo teste + `docs/SETUP-WALLET.md` | Botões funcionam com credenciais; sem elas, mostram "Wallet ainda não configurado" |
| 7 | Notificações automáticas e personalizadas + tarefas agendadas | **Marco final** |

Seed, README e `docs/DECISOES.md` vão sendo atualizados a cada etapa. Commits pequenos.

**Testes** (Vitest): gasto mínimo, limite por plano, troca de plano, edição de visita (com e sem resgate posterior), resgate, telefone duplicado, geração de código (sem O/I/L, único), métricas, limite de notificações e isolamento. Os testes de banco rodam num Supabase local (Docker, disponível aqui).

---

## 7. Decisões que tomei (vão para `docs/DECISOES.md`)

1. **Tarefas agendadas pelo `pg_cron` do Supabase** (chamando rotas da Vercel a cada 5 min), e não pelo Vercel Cron. O plano gratuito da Vercel só roda cron uma vez por dia, o que não basta para mensagens agendadas em data e hora.
2. **Regras de negócio em funções SQL** (atômicas, protegidas pelo RLS). Validações simples (telefone, código, limite de texto) também ficam em TypeScript para dar resposta imediata na tela.
3. **Dinheiro em centavos inteiros**, datas em UTC no banco e exibidas em America/Sao_Paulo.
4. **Nomes de tabelas em português**, para facilitar a leitura no painel do Supabase.
5. **"Desfazer" em vez de "tem certeza?"** para +1/−1 e registro de visita. Desfazer gera um evento compensatório (o histórico continua imutável).
6. **Limite do formulário público** com uma tabela no Postgres (sem Redis), por IP com hash.
7. **Limite de texto das mensagens**: começo com um valor conservador comum às duas plataformas e confirmo na documentação oficial na etapa 7 (o mesmo vale para o limite do Google, de cerca de 3 por 24 h).
8. **Domínio próprio no futuro**: o `middleware` já resolve o estabelecimento pelo caminho; depois basta acrescentar a resolução pelo domínio (tabela `dominios`), sem duplicar código.

## 8. O que vou precisar de você (não bloqueia a etapa 1)

- **Projeto no Supabase** (o gratuito serve) e **conta na Vercel**, para publicar. Até lá, desenvolvo e testo com o Supabase local.
- Mais tarde: contas Apple Developer e Google Pay & Wallet Console (o guia explica o passo a passo).
