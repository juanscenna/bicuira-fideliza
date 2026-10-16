# Decisões tomadas durante o piloto

Decisões que não estavam no documento original (`prompt-bicuira-fideliza.md`). Em cada caso foi escolhida a opção mais simples.

## Etapa 1: base

1. **Tarefas agendadas pelo `pg_cron` do Supabase**, que chama rotas da Vercel a cada 5 minutos, em vez do Vercel Cron. No plano gratuito da Vercel o cron roda uma vez por dia, o que não serve para mensagens agendadas com hora marcada. (Será implementado na etapa 7.)
2. **O dono só lê as tabelas.** Toda alteração feita pelo dono (visita, carimbo, resgate, troca de plano) passa por funções do banco que conferem o estabelecimento do login e fazem tudo numa transação só. Assim:
   - dois cliques seguidos no caixa não dão carimbo em dobro;
   - o histórico de carimbos não pode ser alterado por fora;
   - o total nunca fica negativo nem passa do máximo.

   Os testes provam que o dono não consegue inserir, editar nem apagar nada diretamente.
3. **Registros imutáveis de verdade.** `eventos_carimbo` e `auditoria` têm um gatilho que bloqueia alteração e exclusão até para o sistema. Correções viram um novo evento (por exemplo, "desfazer").
4. **Dinheiro em centavos inteiros** (`1500` = R$ 15,00). Datas guardadas em UTC e exibidas em America/Sao_Paulo.
5. **Nomes de tabelas e colunas em português**, para facilitar a leitura no painel do Supabase.
6. **"Desfazer" em vez de "tem certeza?"** para +1/−1 carimbo e registro de visita (etapa 4). Pedem confirmação só: resgatar, trocar plano e excluir dados de cliente.
7. **Cache Components do Next.js 16 desligado.** O sistema é quase todo dinâmico (login, tempo real), e esse recurso exigiria marcações extras em cada tela, sem ganho no piloto.
8. **Sem autocadastro de logins.** O cadastro público de usuários fica desligado no Supabase; só a Bicuíra cria logins (pelo `/admin` ou pelo script `scripts/criar-super-admin.mjs`). **Em produção, isso precisa ser desligado no painel do Supabase** (passo a passo no README).
9. **IP gravado só com hash** (auditoria e limite do formulário), usando o segredo `SEGREDO_HASH`. Dá para comparar acessos sem guardar o endereço real.
10. **Estabelecimento desativado:** o dono ainda consegue entrar, mas o painel mostra "Estabelecimento desativado. Fale com a Bicuíra" no lugar das telas.
11. **Slugs reservados:** `painel`, `admin`, `entrar`, `api` e outros caminhos do sistema não podem ser usados como endereço de estabelecimento.
12. **Telefone guardado no formato internacional** (`+5548999990001`), só celular (9 dígitos depois do DDD).
13. **Chaves novas do Supabase:** o sistema usa a chave pública (`sb_publishable_…`) e a secreta (`sb_secret_…`), que substituem as antigas `anon` e `service_role`.

## Etapa 2: admin

14. **Logo:** PNG, JPG ou WebP, até 2 MB, guardada no Storage do Supabase (pasta pública `logos`). O envio passa pelo servidor.
15. **Mudar o endereço (slug)** de um estabelecimento é permitido, mas o formulário avisa que os QR Codes já impressos deixam de funcionar.
16. **Cores com contraste baixo** são aceitas (a identidade do cliente manda), mas o admin vê um aviso. A cor do texto sobre a cor do estabelecimento é escolhida automaticamente (branco ou quase-preto).
17. **QR Code para impressão:** folha A5 em PDF (nome, chamada, QR grande e endereço) e PNG de 1200 px.
18. **Exclusão de dados (LGPD):** apaga nome e telefone, troca o link secreto do cartão (o antigo para de funcionar) e remove o cartão do Wallet. As visitas ficam, sem identificar a pessoa, para não distorcer as métricas. Para confirmar, é preciso digitar APAGAR.
19. **Senha do dono:** a Bicuíra define a senha inicial e redefine quando preciso. Não há "esqueci minha senha" por e-mail no piloto.

## Etapa 3: cadastro e cartão web

20. **Limite do formulário público:** 30 cadastros a cada 10 minutos por IP e estabelecimento. É generoso porque muitos clientes usam o mesmo Wi-Fi do restaurante (mesmo IP); serve só para barrar robôs, junto com o campo-isca.
21. **Telefone já cadastrado:** devolve o mesmo cartão, sem alterar nome nem plano. A tela diz apenas "este telefone já tinha um cartão".
22. **Link do cartão:** token aleatório de 48 caracteres. A página não é indexada por buscadores e não envia o endereço para outros sites (`no-referrer`).
23. **Tempo real:** o nome do canal é um hash do token. Pelo canal passa só o aviso "atualizou"; o cartão então busca os dados. Se o tempo real falhar, o cartão também consulta sozinho a cada 30 s e ao voltar para a tela.
24. **Texto do consentimento versionado** (`src/lib/dominio/consentimento.ts`). Cada aceite guarda a versão.

## Etapa 4: painel do dono

25. **"Perto da recompensa"** = faltam 1 ou 2 carimbos.
26. **Desfazer** vale por 10 minutos e só se não houve resgate depois. A visita desfeita fica no histórico, riscada, e não conta nas métricas.
27. **Código digitado:** aceita minúsculas e corrige O→0 e I/L→1 nos números. Com 5 caracteres válidos, a ficha abre sozinha.
28. **Cursor automático:** no computador, o campo do código já começa selecionado. No celular não (o teclado esconderia o botão do QR). Depois de escanear, o cursor vai direto para o valor.
29. **Lista de clientes:** mostra até 200 por vez (busca e filtros resolvem o resto).

## Etapa 5: métricas

30. **Visita de retorno** = qualquer visita do cliente que não seja a primeira dele (mesmo que a primeira tenha sido antes do período escolhido).
31. **Clientes que retornaram** = clientes com pelo menos 1 visita de retorno no período. **Taxa de retorno** = esses clientes ÷ clientes com alguma visita no período.
32. **Ticket médio** = gasto em visitas de retorno ÷ número de visitas de retorno.
33. **Períodos** contam para trás a partir de agora (ex.: últimos 7 × 24 h).
34. **Separação por plano** usa o plano atual de cada cliente.
35. **Clientes inativos** é sempre a situação de agora (não depende do período). Clientes com dados apagados (LGPD) não entram.
36. Visitas desfeitas não contam; visitas corrigidas contam com o valor corrigido.

## Etapa 6: Wallet

37. **Um Pass Type ID (Apple) e um emissor (Google) da Bicuíra** para todos os estabelecimentos. Cada cartão mostra nome, logo e cor do estabelecimento.
38. **Credenciais em base64 nas variáveis de ambiente** (certificados PEM e o JSON da conta de serviço), já que a Vercel não guarda arquivos.
39. **Imagens do pass** (ícone e logo) geradas na hora a partir da logo do estabelecimento ou da inicial do nome.
40. **Notificação na tela de bloqueio (Apple):** os campos de carimbos, situação da recompensa e mensagem têm `changeMessage`. Quando mudam, o iPhone pode avisar o cliente.
41. **Atualização do Wallet depois da resposta** (`after()` do Next.js): o caixa não espera a Apple ou o Google responder.
42. **Google:** a classe do estabelecimento é criada (ou atualizada) quando o primeiro cliente toca em "Adicionar ao Google Wallet". O objeto do cliente só é atualizado depois que ele salvou o cartão.
43. **Mudou nome, logo, cor ou regras no admin:** todos os cartões do estabelecimento são atualizados.
44. **Log do iPhone** (`/v1/log`) vai para o log do servidor (Vercel), sem tabela própria.
45. **Fontes consultadas:** documentação oficial da Apple (web service de atualização de passes) e a especificação oficial da Google Wallet API (discovery document). As páginas de guia do Google não puderam ser abertas deste ambiente; o limite de 3 notificações por cartão a cada 24 h foi confirmado pela página "Trigger push notifications" do Google (resultado de busca) e precisa ser revisado ao ativar o Google Wallet.

## Etapa 7: notificações

46. **Mensagem no cartão = notificação.** O texto vai para o campo de mensagem do cartão: topo do cartão web, verso do Apple Wallet (com `changeMessage`, que pode aparecer na tela de bloqueio) e mensagem do Google Wallet. O status no painel é sempre "enviado", nunca "entregue".
47. **Limite de 150 caracteres** por mensagem, seguro para as duas plataformas, com contador na tela.
48. **Limite das personalizadas:** até o máximo semanal do estabelecimento (padrão 2 em 7 dias, configurável no admin) **e** nenhum envio se o cliente já recebeu 3 mensagens (de qualquer tipo) nas últimas 24 h, por causa do limite do Google. Quem passaria do limite é pulado e aparece no resumo antes de confirmar.
49. **Automáticas não são puladas:** sempre entram no cartão; acima de 3 em 24 h, entram no Google sem notificar.
50. **"Falta pouco" e "Recompensa disponível"** saem uma vez por ciclo do cartão (não repetem se o dono tirar e devolver um carimbo).
51. **"Sentimos sua falta" e "Recompensa esquecida"** rodam na tarefa agendada, só entre 10h e 20h (horário de São Paulo), uma vez por período de inatividade / por recompensa.
52. **Tarefa agendada:** a rota `/api/cron/notificacoes` (protegida por `CRON_SECRET`) roda a cada 5 minutos pelo `pg_cron` + `pg_net` do Supabase (configuração no README). O `vercel.json` também agenda uma execução diária às 11h de São Paulo, como reserva.
53. **Agendamento** aceita até 60 dias à frente. O público é recalculado na hora do envio (quem se cadastrar até lá também recebe).
54. **Seleção manual** de clientes: busca por nome ou código, com caixas de seleção.
