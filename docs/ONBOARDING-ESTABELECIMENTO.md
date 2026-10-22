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
3. Preencha os dois planos (carimbos e recompensa), o gasto mínimo, os dias de inatividade e o limite de mensagens por cliente por semana. Os selos nunca vencem: os dias de inatividade só marcam o cliente como inativo e disparam o aviso "Sentimos sua falta". Para negócios de retorno raro (pousadas), marque "Sem limite".
4. Preencha o contato de privacidade.
5. Em "Status e cobrança", deixe "ativo" marcado. Os campos de cobrança são só controle interno.
6. Clique em Criar estabelecimento. O sistema leva para `/admin/<id>` com a mensagem "Estabelecimento criado".

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
2. Registre o id e as cores e logo em `TEMAS` em `src/temas/config.ts`.
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

Os textos públicos (cadastro e cartão) ficam no próprio tema, em `src/temas/<id>/`.

## 5. Conferência final antes de entregar

- [ ] Cadastro público funciona e devolve o cartão existente se o telefone repetir.
- [ ] Visita com valor abaixo do mínimo registra sem carimbo, com aviso.
- [ ] Carimbo e resgate aparecem no cartão e no painel do dono.
- [ ] Política de privacidade mostra o contato correto.
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
