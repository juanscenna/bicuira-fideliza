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
