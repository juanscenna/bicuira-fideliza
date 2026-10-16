# Prompt — Bicuíra Fideliza (Piloto)

> Especificação original do piloto. O plano de execução está em `docs/PLANO.md`.

## 1. Contexto

Você vai construir o Bicuíra Fideliza, um sistema de fidelidade digital para restaurantes e bares, criado pela Bicuíra Digital (empresa de tecnologia para negócios locais de Garopaba, Praia do Rosa e Imbituba, SC).

O cliente final do restaurante escaneia um QR Code, faz um cadastro rápido e recebe um cartão de fidelidade no Apple Wallet ou Google Wallet. O dono do restaurante, por um painel web, registra visitas, dá carimbos, resgata recompensas, acompanha métricas e envia notificações pelo próprio cartão. Nenhum aplicativo próprio precisa ser instalado.

Esta é a versão piloto: o objetivo é provar que o fluxo completo funciona de ponta a ponta. Não haverá identidade visual de restaurante real nesta fase; use um estabelecimento fictício chamado "Restaurante Teste" com visual neutro. Mesmo assim, o sistema deve nascer preparado para receber a identidade de cada estabelecimento depois (logo e cores como configuração, nunca como código).

Idioma da interface: português do Brasil. Moeda: BRL (R$). Fuso horário: America/Sao_Paulo.

## 2. Arquitetura: um sistema, vários estabelecimentos

O sistema é multi-estabelecimento (multi-tenant): um único código e um único banco de dados atendem todos os restaurantes. Cada estabelecimento tem seus próprios dados, regras, clientes e login, totalmente isolados.

Não existe autocadastro de estabelecimentos. Somente a Bicuíra (super admin) cria e configura estabelecimentos. O dono apenas opera o seu.

### Perfis de acesso

| Perfil | Quem é | O que pode fazer |
|---|---|---|
| Super admin | Equipe Bicuíra | Criar/editar estabelecimentos, definir regras, logo e cores, criar o login do dono, gerar o QR Code, ativar/desativar estabelecimentos, ver tudo. |
| Dono | Proprietário do restaurante (um login por estabelecimento, usado no computador do caixa ou no celular principal) | Operar apenas o próprio estabelecimento: buscar clientes, registrar visitas, adicionar/remover carimbos, resgatar recompensas, ver métricas, enviar notificações. Não edita regras do programa. |
| Cliente final | Consumidor do restaurante | Cadastrar-se pela página pública e adicionar o cartão ao Wallet. Sem login. |

### Stack obrigatória

- Next.js (App Router) + TypeScript
- Supabase: PostgreSQL, Auth (e-mail + senha), Storage (logos e imagens dos cartões), Row Level Security em todas as tabelas
- Vercel para hospedagem, com Vercel Cron (ou pg_cron no Supabase) para tarefas agendadas
- Tailwind CSS para a interface
- Apple Wallet: biblioteca passkit-generator (ou equivalente mantida) para gerar .pkpass, e APNs via HTTP/2 para avisar os aparelhos de atualizações
- Google Wallet: Google Wallet API (Loyalty Class / Loyalty Object), com link "Salvar no Google Wallet" via JWT assinado por conta de serviço

Se alguma escolha acima se mostrar inviável, pare e me explique antes de trocar.

### Endereços

- Página pública de cada estabelecimento: `/{slug}` (ex.: `/restaurante-teste`). O domínio final será fideliza.bicuira.com.br. Estruture para, no futuro, um domínio próprio do cliente poder apontar para o mesmo sistema sem duplicar código.
- Página do cartão do cliente (fallback para quem não usa Wallet): `/{slug}/cartao/{token}`, com token longo e impossível de adivinhar.
- Painel do dono: `/painel`
- Painel super admin: `/admin`

## 3. Regras de negócio

### 3.1 Cadastro do cliente

- Campos: nome (obrigatório) e telefone celular (obrigatório, normalizado no formato brasileiro +55, validado). Sem verificação por SMS.
- Escolha do perfil: o cliente responde "Você é morador da região ou está de visita?" com duas opções grandes: Sou morador / Estou de visita. A tela não mostra as regras nem as recompensas de cada plano antes da escolha, para que o cliente escolha pelo que realmente é. Depois do cadastro, o cartão mostra as regras do plano escolhido. Se o estabelecimento tiver apenas um plano ativo, a pergunta não aparece.
- Checkbox obrigatório de consentimento (LGPD) com link para a política de privacidade do estabelecimento, incluindo consentimento para receber mensagens pelo cartão. Salvar data/hora e versão do texto aceito.
- Telefone é único por estabelecimento. Se alguém se cadastrar de novo com um telefone já existente, o sistema devolve o cartão já existente (é assim que o cliente recupera o cartão ao trocar de celular), sem criar duplicado e sem expor dados de terceiros.
- Proteção básica do formulário público: limite de requisições por IP e campo honeypot contra robôs.

### 3.2 Código do cartão

- Formato: 1 letra + 4 números (ex.: K4827), gerado aleatoriamente, único dentro de cada estabelecimento.
- Não usar as letras O, I e L (evitar confusão com 0 e 1).
- O cartão (Wallet e página web) mostra o QR Code com o código e o código escrito ao lado.

### 3.3 Visitas e carimbos

- Regra do piloto: 1 carimbo por visita, desde que o gasto seja igual ou maior que o mínimo do estabelecimento. Mínimo do piloto: R$ 15,00.
- Dois planos por estabelecimento, cada um com quantidade de carimbos e recompensa próprias. Padrões do piloto:
  - Morador: 10 carimbos = 1 prato
  - Turista: 5 carimbos = 1 sobremesa (recompensa sempre menor que a do morador)
- O gasto mínimo por visita vale para os dois planos.
- O dono pode trocar o plano de um cliente na ficha (ex.: turista que virou frequente). Os carimbos atuais são mantidos, limitados ao máximo do novo plano; se isso completar o cartão, a recompensa fica disponível. A troca fica registrada no histórico e o cartão no Wallet é atualizado.
- Ao registrar uma visita, o dono informa: valor gasto (obrigatório) e descrição do que foi consumido (opcional).
  - Valor ≥ mínimo → visita registrada e +1 carimbo.
  - Valor < mínimo → visita registrada sem carimbo, com aviso claro na tela ("Abaixo do mínimo de R$ 15,00 — visita registrada sem carimbo").
  - Com o cartão cheio (10/10), novas visitas continuam sendo registradas, mas não geram carimbo; o painel exibe com destaque "Recompensa disponível — resgatar agora".
- O dono pode editar o valor e a descrição de uma visita já registrada (para corrigir erros de digitação). Se a correção fizer a visita passar a atingir, ou deixar de atingir, o gasto mínimo, o carimbo dessa visita é ajustado automaticamente, exceto se já houve um resgate depois dela; nesse caso só o valor é corrigido e o painel avisa. Toda edição guarda o valor antigo e o novo no histórico e na auditoria, e as métricas usam sempre o valor corrigido.
- O dono pode adicionar ou remover carimbos manualmente (motivo opcional). O total nunca fica negativo nem passa do máximo.
- Resgate: disponível apenas com o cartão cheio. O dono clica em "Resgatar", entrega a recompensa pessoalmente, o cartão volta a 0 e começa um novo ciclo. O resgate fica no histórico.
- Sem expiração de carimbos e sem regras antifraude no piloto, mas modele os dados para que isso possa ser adicionado depois.
- Toda alteração (visita, carimbo, resgate) deve atualizar imediatamente o cartão no Apple Wallet e no Google Wallet.

### 3.4 Regras configuráveis por estabelecimento (só o super admin edita)

- Nome, slug, logo, cor primária, cor secundária
- Planos ativos: morador, turista ou ambos (padrão: ambos)
- Para cada plano: quantidade de carimbos para a recompensa e texto da recompensa (padrões na seção 3.3)
- Gasto mínimo por visita (padrão R$ 15,00)
- Dias sem visita para considerar o cliente inativo (padrão 30)
- Status do estabelecimento (ativo/inativo) e campos para cobrança futura (plano, status de pagamento, data de vencimento), por enquanto apenas informativos; a cobrança acontece fora do sistema.

## 4. Cartão no Wallet

O cartão é emitido pela conta da Bicuíra, mas exibe nome e logo do estabelecimento.

Conteúdo do cartão:

- Nome e logo do estabelecimento
- Nome do cliente
- Carimbos atuais e progresso (ex.: "7 de 10") e o texto da recompensa
- QR Code + código escrito
- Campo de mensagem (usado pelas notificações; ver seção 6)
- No verso: regras do programa, link para o cartão web e para a política de privacidade, "por Bicuíra Digital"

### Cartão web (usado no teste do piloto e como alternativa permanente)

Antes das contas Apple e Google estarem configuradas, o cartão web é a forma de demonstrar o sistema. Por isso ele precisa ser convincente:

- Visual de cartão de Wallet: mesmo formato, proporção e hierarquia de um cartão do Apple Wallet (cabeçalho com logo e nome do estabelecimento, carimbos em destaque visual (ícones preenchidos/vazios), nome do cliente, texto da recompensa, QR Code com o código ao lado). Deve ocupar bem a tela do celular.
- Atualização em tempo real: quando o dono registra uma visita, altera carimbos ou resgata no painel, o cartão web aberto no celular do cliente se atualiza sozinho em poucos segundos, sem recarregar a página (use Supabase Realtime), com uma pequena animação no carimbo novo.
- Mensagens: as notificações enviadas pelo painel aparecem no cartão web como um aviso no topo, simulando o que o cliente veria no Wallet.
- Salvar na tela inicial: a página deve funcionar como atalho na tela inicial do celular (manifest web com nome e ícone do estabelecimento) e orientar o cliente a fazer isso.

### Apple Wallet

- Gerar .pkpass do tipo storeCard, assinado com o certificado do Pass Type ID.
- Implementar o web service oficial de atualização de passes (registro de dispositivo, listagem de passes atualizados, entrega da versão mais recente, cancelamento de registro, log).
- Ao alterar um cartão, enviar push via APNs para os dispositivos registrados; usar changeMessage nos campos para que a alteração apareça como notificação na tela de bloqueio.

### Google Wallet

- Uma Loyalty Class por estabelecimento e um Loyalty Object por cliente.
- Botão "Salvar no Google Wallet" com JWT assinado.
- Atualizar o objeto via API a cada alteração. Notificações via mensagens com notificação, respeitando o limite oficial do Google (cerca de 3 por cartão a cada 24 h; confirme na documentação).

### Obrigatório

- Consulte a documentação oficial atual da Apple e do Google antes de implementar e siga as regras de cada plataforma. Não presuma entrega garantida de notificações. Avisos por localização ficam fora do piloto.
- Modo de teste sem credenciais: o sistema deve funcionar por completo (cadastro, painel, carimbos, métricas, cartão web) mesmo antes de eu ter as contas Apple e Google. Sem credenciais configuradas, os botões de Wallet mostram "Wallet ainda não configurado" e as atualizações são apenas registradas em log. Com as credenciais nas variáveis de ambiente, tudo passa a funcionar sem mudar código.
- Escreva um guia docs/SETUP-WALLET.md em linguagem simples, passo a passo, explicando como: criar a conta Apple Developer, criar o Pass Type ID, gerar e exportar o certificado; criar a conta de emissor no Google Pay & Wallet Console, a conta de serviço no Google Cloud e pedir a aprovação para produção; e onde colocar cada credencial.

## 5. Telas

### 5.1 Página pública de cadastro (`/{slug}`)

- Visual do estabelecimento (no piloto: neutro, com nome "Restaurante Teste" e logo placeholder), rodapé discreto "por Bicuíra Digital".
- Formulário: nome, telefone, consentimento. Mobile-first, rápido, sem distrações.
- Após o cadastro: tela do cartão com prévia (carimbos, código, QR Code) e botões "Adicionar ao Apple Wallet" e "Adicionar ao Google Wallet", destacando o mais adequado ao aparelho mas mostrando os dois. Link para salvar o cartão web.
- Se o estabelecimento estiver inativo, mostrar uma mensagem amigável no lugar do formulário.

### 5.2 Painel do dono (`/painel`)

Responsivo, igualmente bom no computador do caixa e no celular. Operação rápida é prioridade: registrar uma visita deve levar poucos segundos.

- Início: campo grande "Código do cartão" + botão "Escanear QR Code" (leitor pela câmera do navegador, funcionando no celular e no computador com webcam). Abaixo, um resumo rápido do dia.
- Ficha do cliente: nome, telefone, código, plano (morador/turista, com opção de trocar), progresso de carimbos, recompensa disponível ou não, histórico de visitas (data, valor, descrição, se gerou carimbo) e de carimbos/resgates. Ações: Registrar visita, +1 / −1 carimbo, Resgatar.
- Clientes: lista completa com busca por nome, telefone ou código; filtros (plano, inativos, perto da recompensa, recompensa disponível) e ordenação (última visita, total gasto, nº de visitas). Clique abre a ficha.
- Métricas (com filtro de período: 7 dias, 30 dias, 90 dias, tudo):
  - Clientes cadastrados
  - Clientes que retornaram (2 ou mais visitas registradas) e taxa de retorno
  - Gasto em visitas de retorno (soma dos valores de todas as visitas, exceto a primeira de cada cliente) e ticket médio
  - Total de visitas registradas e gasto total registrado
  - Recompensas resgatadas
  - Clientes inativos
  - Todos os indicadores podem ser vistos no total e separados por plano (morador × turista)
  - Textos dos indicadores não podem afirmar causalidade. Use "clientes que retornaram", nunca "clientes que voltaram por causa do cartão". Deixe claro que os valores são os registrados no painel, não o faturamento do restaurante.
- Notificações: criar mensagem personalizada, ver histórico de envios, ver as automáticas ativas (ver seção 6).

### 5.3 Painel super admin (`/admin`)

- Lista de estabelecimentos com status e número de clientes.
- Criar/editar estabelecimento (todos os campos da seção 3.4, upload de logo, seletor de cores).
- Criar o login do dono (e-mail + senha inicial; permitir redefinir senha).
- Gerar o QR Code do estabelecimento para download (PNG e PDF pronto para imprimir), apontando para `/{slug}`.
- Ativar/desativar estabelecimento.
- Excluir/anonimizar dados de um cliente mediante solicitação (LGPD).

## 6. Notificações (somente pelo cartão no Wallet)

Mecanismo: atualizar o campo de mensagem do cartão (Apple, com changeMessage) ou enviar mensagem com notificação (Google). No painel, o status de um envio é "enviado", nunca "entregue", pois a entrega não é garantida e o cliente pode desativar as notificações.

### Automáticas (ativas por padrão, o dono pode ligar/desligar cada uma)

- Falta pouco: quando o cliente chega a 1 carimbo da recompensa.
- Recompensa disponível: quando o cartão completa.
- Sentimos sua falta: quando o cliente fica X dias sem visita (X = dias de inatividade do estabelecimento). Enviar uma única vez por período de inatividade, processado por tarefa agendada diária em horário comercial. Ativa por padrão só para moradores; para turistas fica desligada por padrão (o dono pode ligar).
- Recompensa esquecida: quando o cliente tem a recompensa disponível há mais de 15 dias sem resgatar.

### Personalizadas (criadas pelo dono)

- Texto da mensagem com limite de caracteres compatível com as duas plataformas (exibir contador).
- Público: todos, só moradores, só turistas, inativos, perto da recompensa, recompensa disponível, ou seleção manual de clientes na lista.
- Mostrar quantos clientes serão atingidos antes de confirmar.
- Enviar agora ou agendar data e hora.
- Limite de frequência: cada cliente recebe no máximo 2 mensagens personalizadas por semana (configurável pelo super admin), além de respeitar o limite do Google. Clientes que excederiam o limite são pulados e isso aparece no resumo do envio.

## 7. Dados e segurança

- Modele, no mínimo: estabelecimentos, perfis de usuário (super admin / dono, vinculados ao estabelecimento), clientes, visitas, eventos de carimbo (registro imutável de cada +1, −1 e resgate), passes do Wallet (serial, token de autenticação, id do objeto Google, versão), registros de dispositivos Apple, campanhas de notificação, envios de notificação e log de auditoria.
- Isolamento total entre estabelecimentos via Row Level Security em todas as tabelas + verificação no servidor. Escreva testes que provem que o dono de um estabelecimento não consegue ler nem alterar dados de outro.
- Toda ação no painel gera registro de auditoria (o quê, quando, qual login, qual aparelho/navegador). No piloto há um login por estabelecimento, então o histórico identifica o login, não a pessoa.
- Chaves secretas e certificados apenas em variáveis de ambiente, nunca no repositório. Forneça .env.example comentado.
- A chave de serviço do Supabase só pode ser usada no servidor.
- Página de política de privacidade por estabelecimento, gerada a partir de um modelo simples (dados coletados, finalidade, como pedir exclusão, contato).

## 8. Visual

- Páginas públicas e cartão: visual neutro e limpo no piloto, com tema montado a partir das cores e da logo do estabelecimento (variáveis CSS), para que trocar a identidade seja só configuração.
- Painéis (dono e super admin): aplicar a marca Bicuíra de forma simples, sem refinamento visual nesta fase:
  - Cores: Restinga #25433D (principal), Pôr do Sol #C35E2F (destaque), Areia #F2EBDD (fundo), Oceano #4E889A (secundária), Carvão #292A29 (textos), Lima #B4CD64 (ações e estados positivos)
  - Fontes: Baloo 2 ExtraBold para títulos, Sora para textos (Google Fonts)
- Não gaste esforço em ilustrações, animações ou polimento visual. Prioridade: clareza, velocidade de uso e funcionar bem no celular.

## 9. Fora do escopo do piloto

Não implemente agora, mas não impeça no modelo de dados:

- Autocadastro de estabelecimentos
- Vários usuários/funcionários por estabelecimento
- Expiração de carimbos e regras antifraude
- Cobrança e pagamentos dentro do sistema
- Exportação CSV
- Verificação de telefone
- Notificações por WhatsApp, SMS, e-mail ou Web Push
- Avisos por localização
- Domínio próprio por cliente

## 10. Como trabalhar

- Antes de escrever código, apresente: estrutura de pastas, modelo de dados (tabelas e relações), políticas de RLS e a ordem de construção. Espere minha confirmação.
- Construa nesta ordem, parando ao final de cada etapa para me mostrar o que foi feito e como testar:
  1. Base do projeto, banco, autenticação, perfis e RLS
  2. Painel super admin + estabelecimento "Restaurante Teste" + QR Code
  3. Página pública de cadastro + cartão web
  4. Painel do dono: busca, leitor de QR, ficha, visitas, carimbos, resgate
  5. Métricas
  6. Apple Wallet e Google Wallet (com modo de teste sem credenciais) + docs/SETUP-WALLET.md
  7. Notificações automáticas e personalizadas
- Escreva testes automatizados para as regras de negócio (gasto mínimo, limite de carimbos por plano, troca de plano, edição de visita, resgate, telefone duplicado, geração de código, cálculo das métricas, limite de notificações) e para o isolamento entre estabelecimentos.
- Crie um seed com o "Restaurante Teste", um login de dono de teste e uns 20 clientes fictícios (moradores e turistas) com visitas variadas, para as métricas terem o que mostrar. Registre os logins de teste no README, não no chat.
- Escreva um README.md em português simples: como rodar localmente, como publicar na Vercel, como criar um novo estabelecimento e como configurar o Wallet.
- Use commits pequenos e descritivos.
- Quando houver uma decisão que não está neste documento, escolha a opção mais simples, registre-a em docs/DECISOES.md e me avise no resumo da etapa.

## Critério de pronto do piloto

**Primeiro marco** (sem contas Apple/Google): com o sistema publicado na Vercel, consigo fazer todo o fluxo abaixo usando o cartão web no lugar do Wallet, vendo o cartão se atualizar sozinho no celular a cada ação no painel.

**Marco final**: consigo, sozinho: criar um estabelecimento no /admin, imprimir o QR Code, escanear com o celular, me cadastrar, adicionar o cartão ao Wallet, registrar uma visita no /painel pelo leitor de QR, ver o carimbo aparecer no cartão do celular, completar 10 carimbos, resgatar, ver o cartão voltar a zero, ver as métricas atualizadas e receber uma notificação personalizada no cartão.
