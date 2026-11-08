# Passo a passo: novo estabelecimento no Bicuíra Fideliza

Use este roteiro sempre que entrar um restaurante, bar ou pousada (com área de consumo) no piloto.

## Antes de começar (combinar com o cliente)

- Nome exato do estabelecimento como aparece na fachada e no Instagram.
- Endereço da página (slug), sem acento e sem espaço. Ex.: `sonhos-do-rosa`. Depois de impresso, o QR não pode mudar de endereço.
- Gasto mínimo por visita (padrão do piloto: R$ 15,00).
- Planos: morador (padrão 10 carimbos = 1 prato) e turista (padrão 5 carimbos = 1 sobremesa). A recompensa do turista deve ser menor que a do morador.
- Contato para pedidos de exclusão de dados (LGPD): e-mail ou telefone do estabelecimento.
- E-mail do dono para o login.
- Logo e cores, se houver (ver a seção "Identidade" abaixo).
- Termo de piloto assinado ou aceito por escrito: gratuito por 30 dias, feedback ao final, autorização (ou não) para citar o caso.

## 1. Criar o estabelecimento (`/admin` → Novo)

1. Entre em `/admin` com a conta de super admin.
2. Clique em Novo estabelecimento e preencha nome e endereço (o endereço é sugerido pelo nome; confira).
3. Escolha o tipo de negócio. Ele já preenche uma configuração básica e define a linguagem do painel do dono:
   - **Restaurante**: selo por gasto mínimo (R$ 15,00), morador 10 selos = 1 prato, turista 5 selos = 1 sobremesa.
   - **Bar**: selo por gasto mínimo (R$ 20,00), morador 10 selos = 1 porção, turista 5 selos = 1 drink.
   - **Pousada**: 1 selo por estadia, sem gasto mínimo (o valor da hospedagem é opcional e serve só para as métricas); só o plano de hóspedes (3 selos = 1 café da manhã) e inatividade sem limite. O painel fala de hospedagem e recepção.
4. Ajuste os planos (carimbos e recompensa), o gasto mínimo, os dias de inatividade e o limite de mensagens por cliente por semana. Os selos nunca vencem: os dias de inatividade só marcam o cliente como inativo e disparam o aviso "Sentimos sua falta". Para negócios de retorno raro (pousadas), marque "Sem limite".
5. Preencha o contato de privacidade.
6. Em "Status e cobrança", deixe "ativo" marcado. Os campos de cobrança são só controle interno.
7. Clique em Criar estabelecimento. O sistema leva para `/admin/<id>` com a mensagem "Estabelecimento criado".

## 2. Criar o login do dono (`/admin/<id>` → Login do dono)

1. Informe o e-mail e uma senha inicial de pelo menos 8 caracteres.
2. Clique em criar. Passe ao dono o e-mail e a senha por canal seguro (WhatsApp pessoal, pessoalmente). Peça para trocar a senha no primeiro acesso.
3. O dono entra em `/entrar` e cai no `/painel`. Ele só vê o próprio estabelecimento e não edita regras.

Se o dono esquecer a senha: use "Redefinir senha" na mesma tela do `/admin/<id>`.

## 3. Baixar o QR Code (`/admin/<id>` → QR Code)

1. Baixe o PNG (para WhatsApp, Instagram, redes) ou o PDF (para impressão).
2. Teste o QR antes de imprimir: abra no celular, faça um cadastro de teste e confira o cartão em `/<slug>/cartao/<token>`.
3. Só imprima depois que o domínio final estiver definido. O QR aponta para `NEXT_PUBLIC_SITE_URL`.
4. Apague o cadastro de teste em `/admin/<id>/clientes` (LGPD, ver a seção abaixo).

## 4. Identidade visual (logo e cores)

Hoje a identidade de cada estabelecimento é feita em código, não no admin. Para um novo estabelecimento:

1. Crie a pasta `src/temas/<id>/` seguindo o modelo de `src/temas/basico/` (ou `src/temas/rosa-norte/`, que é o mais completo): `Moldura.tsx` (cadastro e cartão público) e `Cartao.tsx` (o cartão do Wallet e da página).
2. Registre o id e as cores e logo em `TEMAS` em `src/temas/config.ts`, **incluindo `faixa`** (visual do cartão no Google Wallet, ver "Regras do Wallet" abaixo).
3. Registre os componentes em `src/temas/molduras.tsx` e `src/temas/cartoes.tsx`.
4. Ligue o slug ao tema em `TEMA_POR_SLUG` (`src/temas/config.ts`).
5. Coloque a logo em `public/temas/<id>/` e o ícone em `logo-256.png`.
6. Rode `npm run build`, confira o cadastro e o cartão no celular, e publique.

Sem tema próprio, o estabelecimento usa o visual `basico` (preto e branco). Isso já serve para o piloto.

**Atenção:** o documento original do piloto (`prompt-bicuira-fideliza.md`) diz que logo e cores devem ser configuração, nunca código. A forma atual é código. Decida se isso muda antes do segundo cliente, senão cada novo restaurante exige deploy.

### Vocabulário do painel (quando não é restaurante)

O painel do dono e os avisos automáticos falam como restaurante por padrão (visita, caixa, moradores e turistas). Para outro tipo de negócio, adicione o tema em `POR_TEMA` em `src/temas/vocabulario.ts`:

- `trocas`: palavras trocadas em todos os textos do painel e dos avisos automáticos (ex.: pousada: visita → hospedagem, caixa → recepção, turista → hóspede). Ponha as expressões mais longas primeiro.
- `mostrarPlanos`: `false` esconde os filtros de moradores e turistas (para quem usa só um plano).
- `descricao` e `exemploMensagem`: o rótulo do campo de descrição e o exemplo de nova mensagem.
- `automaticas`: título, explicação e texto próprios de cada aviso automático (no texto, use `{recompensa}`, `{carimbos}` e `{meta}`).

Os textos públicos (cadastro e cartão) ficam no próprio tema, em `src/temas/<id>/`, sempre no vocabulário do negócio (pousada: "recepção", "hospedagem", "hóspede"; nunca "caixa", "balcão", "visita" ou "restaurante"). Textos gerados pelo sistema (notificação de boas-vindas, regras no Wallet, cartão básico) já seguem o **tipo de negócio** escolhido no admin.

### Regras do Wallet (todo estabelecimento novo)

O cartão no Google Wallet (e no Apple Wallet, quando ligado) precisa ser **o mesmo cartão** da página web: mesmas cores, mesmos selos, mesmas palavras.

1. **Faixa de selos = cartão web.** Em `TEMAS` (`src/temas/config.ts`), o campo `faixa` é obrigatório (o build falha sem ele). Copie do `Cartao.tsx` do tema: fundo do cartão, barra do topo, cor do número, cor da pílula "Faltam X", contorno do selo ganho, aparência do espaço vazio e, se o cartão web tem, o presente no último selo. Se o tema tem selo com a logo, gere `selo-160.png` e `selo-cinza-160.png` em `public/temas/<id>/` e preencha `selos`.
2. **Conferir a faixa antes de entregar:** abra `/api/wallet/selos/<slug>/1-<meta>.png` e `/api/wallet/selos/<slug>/<meta>-<meta>.png` lado a lado com o cartão web.
3. **Mudou o visual de um tema já publicado?** Aumente `VERSAO_FAIXA` em `src/lib/wallet/google.ts`: o Google guarda a imagem antiga em cache. Os cartões já salvos trocam a imagem na próxima visita registrada.
4. **Botão do Wallet perto do cartão.** A página do cartão própria do tema (`PaginaCartao.tsx`) recebe `wallet` e tem que mostrar `{status ? wallet : null}` logo **acima** do cartão (recém-criado ou recuperado) e `{status ? null : wallet}` logo **abaixo** (outras visitas). Nunca no fim da página. Um teste confere isso.
5. **Android vai direto para o Google Wallet** no próprio toque em "Criar meu cartão" (o Chrome só abre o app do Wallet logo depois de um toque; por isso o link já vem na resposta do formulário, sem passar antes pela página do cartão) (cartão criado ou recuperado pelo telefone), uma vez por aparelho. Ao voltar do Google, o cliente cai no cartão web: os dois funcionam juntos, e o cartão do Wallet tem o link "Cartão no navegador". No iPhone, o botão do Apple Wallet fica em destaque acima do cartão.
6. **Título do cartão = só o nome do estabelecimento** (o mesmo do admin). Nada de slogans: o Google corta textos longos. Na frente do cartão ficam só valores curtos ("1/3"); quanto falta e a recompensa por extenso vão na faixa de selos, e o texto completo também em "Sua recompensa", nos detalhes.
7. **Logo no Google Wallet:** o Google recorta a logo num círculo. Ela é gerada quadrada em `/api/wallet/logo/<slug>.png`. No tema, `logoWallet.escala` (logo redonda: `1`; logo larga: ~`0.8`) e, se a logo tiver partes brancas, `logoWallet.fundo: "#FFFFFF"`. Confira abrindo o endereço e imaginando o círculo: nada pode encostar na borda.
8. **Instagram** no cartão: `wallet.instagram` no tema.
9. **Textos da faixa legíveis no celular:** a faixa aparece a ~1/3 do tamanho; não diminua as fontes da rota `/api/wallet/selos`.

## 5. Conferência final antes de entregar

- [ ] Cadastro público funciona e devolve o cartão existente se o telefone repetir.
- [ ] Visita com valor abaixo do mínimo registra sem carimbo, com aviso.
- [ ] Carimbo e resgate aparecem no cartão e no painel do dono.
- [ ] Wallet (se ligado): no Android, criar um cartão de teste abre o Google Wallet sozinho; o cartão salvo tem as mesmas cores e selos do cartão web; registrar uma visita atualiza a faixa; nenhum texto diz "restaurante", "caixa" ou "visita" se não for restaurante (notificação de boas-vindas inclusa).
- [ ] Política de privacidade mostra o contato correto.
- [ ] No cartão de teste: "Novidades e promoções" liga e desliga; "Baixar meus dados" baixa o arquivo; "Apagar meus dados" apaga (use um cadastro de teste).
- [ ] Dono entrou com o próprio login e não vê outros estabelecimentos.
- [ ] Nenhum texto no site ou no cartão promete resultado ou recurso que não existe.
- [ ] Label "Produto em desenvolvimento" mantido no site da Bicuíra Digital.

## Dados de clientes e LGPD

- Pedido de exclusão: `/admin/<id>` → "Apagar dados de um cliente (LGPD)". Não apague no banco direto.
- Cadastros de teste devem ser apagados antes da entrega.

## Depois da entrega

- Marque o feedback do dia 30 na agenda.
- Registre o que o dono disse, sem inventar números, em uma planilha de pilotos.
- Só cite o caso publicamente com autorização por escrito.

## 6. Materiais de divulgação (fazer depois que o estabelecimento estiver criado)

Ordem recomendada: site, placa, depois a mensagem para os clientes.

### 6a. Página no site da Bicuíra Digital (repositório `site-bicuira`)

1. Adicione o case em `src/content/projects.ts` (uma entrada nova com `service` e imagens). Ele aparece na página do serviço e ganha página própria pelo `GenericProject`.
2. Fotos: use as reais do estabelecimento em `public/images/projects/`. Se não houver captura real, deixe `src: ''` (aparece "Captura em breve"). Não use imagem ilustrativa como captura.
3. Textos com fidelidade: nome correto, só links reais, nada de número, resultado ou depoimento que não existe. Fideliza é sempre "Produto em desenvolvimento".
4. Rode `npm run build` (precisa passar) e publique.

### 6b. Placa 10x15 cm com QR (repositório `bicuira-fideliza`, pasta `docs/arte/fonte/`)

1. Copie `placa.html` e `gerar.mjs` para uma pasta nova, por estabelecimento (ex.: `docs/arte/fonte-<id>/`).
2. No `gerar.mjs`, troque a constante `URL` pelo link de criação do cartão (`https://bicuira-fideliza.vercel.app/<slug>`) e o caminho `pub` pela pasta de imagens do novo tema (`public/temas/<id>/`).
3. No `placa.html`, troque nome, textos e cores pelos do estabelecimento. Hoje o arquivo está escrito para a Pousada Sonhos do Rosa.
4. Rode `node gerar.mjs` (precisa de `playwright-core` e `qrcode`; o Chromium do ambiente é `/opt/pw-browsers/chromium`). Gera o PDF vetorial e o PNG.
5. Antes de imprimir, escaneie o QR gerado com o celular e confirme que abre o cadastro certo.

Observação: o PDF do QR baixado no painel (`/admin/<id>` → QR Code) é uma folha A5 genérica com o nome e o endereço. A placa 10x15 com a identidade é a versão desenhada à mão em `placa.html`.

### 6c. Mensagem para os clientes (WhatsApp)

1. Envie o vídeo do Fideliza primeiro e o texto depois.
2. Use uma lista de transmissão (não dá para colocar nome por nome). O texto não tem `{{nome}}`, porque a lista não preenche esse campo.
3. Faça duas versões: uma para quem está chegando (ex.: fim de semana) e outra para os clientes já etiquetados. Não misture os dois públicos no mesmo texto.
4. Todo texto de divulgação precisa ter o link de criação, a instrução de como sair ("responda SAIR") e nada que prometa resultado.

### 6d. Condições do piloto (para o cliente)

- Implantação: R$ 299,90 (uma vez).
- Mensalidade: R$ 39,90 + R$ 1,00 por selo emitido.
- Piloto de no máximo 3 meses, para testar com um restaurante de cada tipo antes de fechar o plano.
- Criação do cartão em até 10 dias úteis.
- Entregáveis: site, cartão próprio salvo no Google Wallet e no Apple Wallet, painel do dono, placa com QR.
- Apresentação de vendas: `comercial/apresentacao/` (`Bicuira-Fideliza-Apresentacao-Tela.html`, gerada por `gerar-tela.mjs`). Os planos e preços foram removidos da apresentação de propósito: serão mostrados depois do piloto, com as métricas.

## Como retomar em uma nova conversa

Comece a conversa com: "leia docs/ONBOARDING-ESTABELECIMENTO.md e me ajude a montar o novo estabelecimento X". O roteiro inteiro está aqui, então não depende do histórico do chat.
