# Como configurar o Apple Wallet e o Google Wallet

Sem estas configurações, o sistema funciona normalmente com o **cartão web**. Os botões de Wallet mostram "Wallet ainda não configurado" e as atualizações ficam só registradas no log.

Quando as credenciais forem colocadas nas variáveis de ambiente da Vercel, tudo passa a funcionar **sem mudar código**.

> **Nunca** coloque certificados, chaves ou arquivos `.json` de conta de serviço no repositório nem mande por chat ou e-mail. Eles vão somente nas variáveis de ambiente da Vercel.

Você vai precisar de um terminal com `openssl` e `base64` (já vêm no Mac e no Linux; no Windows, use o Git Bash).

---

## Parte 1: Apple Wallet

### 1. Conta Apple Developer

1. Acesse [developer.apple.com/programs](https://developer.apple.com/programs/) e clique em **Enroll**.
2. Inscreva-se como **organização** (Bicuíra Digital) ou pessoa física. Como organização, a Apple pede o número **D-U-N-S** da empresa (dá para solicitar de graça pelo próprio processo da Apple; leva alguns dias).
3. Pague a anuidade do programa e aguarde a aprovação.
4. Depois de aprovado, em **Membership details**, anote o **Team ID** (10 letras/números, ex.: `ABCDE12345`).

### 2. Criar o Pass Type ID

1. Entre em **Certificates, Identifiers & Profiles → Identifiers**.
2. Clique no **+**, escolha **Pass Type IDs** e continue.
3. Descrição: `Bicuíra Fideliza`. Identificador: `pass.br.com.bicuira.fideliza`.
4. Clique em **Register**.

Um único Pass Type ID serve para todos os restaurantes: o cartão é emitido pela Bicuíra e mostra o nome e a logo de cada estabelecimento.

### 3. Gerar o certificado do cartão

No terminal, numa pasta **fora** do projeto:

```bash
# 1) chave privada + pedido de certificado
openssl req -new -newkey rsa:2048 -nodes \
  -keyout pass.key -out pass.csr \
  -subj "/CN=Bicuira Fideliza/O=Bicuira Digital/C=BR"
```

1. No site da Apple, abra o Pass Type ID criado e clique em **Create Certificate**.
2. Envie o arquivo `pass.csr` e baixe o certificado (`pass.cer`).
3. Converta para o formato que o sistema usa:

```bash
openssl x509 -inform der -in pass.cer -out pass.pem
```

4. Baixe também o certificado intermediário da Apple (**Worldwide Developer Relations - G4**) em [apple.com/certificateauthority](https://www.apple.com/certificateauthority/) e converta:

```bash
openssl x509 -inform der -in AppleWWDRCAG4.cer -out wwdr.pem
```

> Esse mesmo certificado do cartão também é usado para avisar os iPhones das atualizações (APNs). Ele vale cerca de 1 ano: anote a data e renove antes de vencer (repita o passo 3).

### 4. Transformar os arquivos em texto (base64)

```bash
base64 -i pass.pem | tr -d '\n' > pass.pem.b64
base64 -i pass.key | tr -d '\n' > pass.key.b64
base64 -i wwdr.pem | tr -d '\n' > wwdr.pem.b64
```

(No Linux, use `base64 -w0 pass.pem` no lugar de `base64 -i ... | tr -d '\n'`.)

### 5. Variáveis na Vercel

Em **Vercel → Project → Settings → Environment Variables**:

| Variável | O que colocar |
|---|---|
| `APPLE_PASS_TYPE_ID` | `pass.br.com.bicuira.fideliza` |
| `APPLE_TEAM_ID` | o Team ID (passo 1) |
| `APPLE_PASS_CERT_BASE64` | conteúdo de `pass.pem.b64` |
| `APPLE_PASS_KEY_BASE64` | conteúdo de `pass.key.b64` |
| `APPLE_PASS_KEY_PASSPHRASE` | deixe vazio (a chave do passo 3 foi criada sem senha) |
| `APPLE_WWDR_CERT_BASE64` | conteúdo de `wwdr.pem.b64` |

Faça um novo deploy. Depois, apague os arquivos `.b64` do computador e guarde `pass.key` e `pass.pem` num lugar seguro (por exemplo, um gerenciador de senhas).

### 6. Testar

1. O sistema precisa estar publicado com **HTTPS** (a Vercel já faz isso). A Apple não atualiza cartões em endereços sem HTTPS.
2. No iPhone, abra o cartão de um cliente de teste e toque em **Adicionar ao Apple Wallet**.
3. No painel, registre uma visita: em alguns segundos o cartão no Wallet mostra o carimbo novo. Se as notificações estiverem ativas no iPhone, aparece "Seus carimbos: 1/10" na tela de bloqueio.

As notificações dependem da Apple e das configurações do cliente: a entrega não é garantida.

---

## Parte 2: Google Wallet

### 1. Conta de emissor (Google Pay & Wallet Console)

1. Acesse [pay.google.com/business/console](https://pay.google.com/business/console) com a conta Google da Bicuíra.
2. Crie o perfil da empresa (Bicuíra Digital).
3. No menu, abra **Google Wallet API** e anote o **Issuer ID** (número longo, ex.: `3388000000012345678`).

### 2. Conta de serviço no Google Cloud

1. Acesse [console.cloud.google.com](https://console.cloud.google.com), crie um projeto (ex.: `bicuira-fideliza`).
2. Em **APIs e serviços → Biblioteca**, procure **Google Wallet API** e clique em **Ativar**.
3. Em **IAM e administrador → Contas de serviço**, crie uma conta (ex.: `fideliza-wallet`). Não precisa dar papéis no projeto.
4. Abra a conta criada → **Chaves → Adicionar chave → Criar nova chave → JSON**. Um arquivo `.json` será baixado. **Esse arquivo é secreto.**

### 3. Dar acesso à conta de serviço

1. Volte ao **Google Pay & Wallet Console → Google Wallet API → Usuários** (ou **Users**).
2. Convide o e-mail da conta de serviço (termina em `.iam.gserviceaccount.com`) com permissão de **Developer**.

### 4. Variáveis na Vercel

```bash
base64 -i chave-da-conta.json | tr -d '\n' > google.b64
```

| Variável | O que colocar |
|---|---|
| `GOOGLE_WALLET_ISSUER_ID` | o Issuer ID (passo 1) |
| `GOOGLE_WALLET_SERVICE_ACCOUNT_BASE64` | conteúdo de `google.b64` |

`NEXT_PUBLIC_SITE_URL` precisa ser o endereço real (ex.: `https://fideliza.bicuira.com.br`): o Google só aceita o botão "Salvar" vindo desse endereço.

Faça um novo deploy e apague `google.b64` e o `.json` do computador (guarde o `.json` num lugar seguro).

### 5. Modo de demonstração e aprovação para produção

- No começo, a conta de emissor fica em **modo de demonstração**: só as contas Google cadastradas como **usuários de teste** no console conseguem salvar o cartão. Use isso para o piloto.
- Para liberar para qualquer cliente, peça **acesso de publicação** (*Request publishing access*) no console e preencha os dados da empresa. O Google analisa e responde por e-mail.
- Cada estabelecimento vira uma "classe" de cartão, criada automaticamente na primeira vez que um cliente toca em **Adicionar ao Google Wallet**.

### 6. Limites do Google

- O cartão é atualizado a cada visita, carimbo ou resgate.
- **Mensagens com notificação: no máximo 3 por cartão a cada 24 horas** (regra do Google). Quando passa disso, o sistema ainda coloca a mensagem no cartão, mas sem notificar.
- A entrega das notificações não é garantida e o cliente pode desativá-las.

---

## Onde fica cada coisa no código

- `src/lib/wallet/apple.ts`: monta e assina o `.pkpass` e avisa os iPhones (APNs).
- `src/app/api/wallet/apple/v1/…`: web service oficial da Apple (registro de aparelho, lista de atualizações, entrega do cartão, cancelamento e log).
- `src/lib/wallet/google.ts`: classe por estabelecimento, objeto por cliente, link "Salvar" e mensagens.
- `src/lib/wallet/config.ts`: decide se cada Wallet está configurado (modo de teste quando falta alguma variável).
