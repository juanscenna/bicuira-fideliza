# Roteiro: novo restaurante (ou bar / pousada) no Bicuíra Fideliza

**Como usar:** quando alguém disser "vou criar um novo restaurante", o assistente deve fazer as perguntas abaixo, uma seção de cada vez, e guardar as respostas em `docs/clientes/<slug>.md` (modelo no fim deste arquivo). Depois, seguir `docs/ONBOARDING-ESTABELECIMENTO.md`, na ordem.

Pergunte tudo o que faltar. Se a resposta não estiver clara, pergunte de novo. Não invente valor: campo sem resposta fica "a definir" e é avisado antes de criar.

---

## 1. Quem é o cliente

1. Nome exato do estabelecimento, como aparece na fachada e no Instagram.
2. Tipo de negócio: restaurante, bar ou pousada?
3. Cidade e bairro.
4. Instagram (@).
5. Nome da pessoa que vai usar o painel (dono ou gerente) e o e-mail dela para o login.
6. Telefone ou WhatsApp de contato do estabelecimento.
7. Contato para pedidos de exclusão de dados (LGPD): pode ser o mesmo telefone ou e-mail?

## 2. Endereço e identidade

8. Endereço da página, sem acento e sem espaço (sugestão: o nome sem acento e sem espaço, ex.: `sonhos-do-rosa`). **Depois de impresso, não pode mudar.** Confirme com o cliente.
9. Tem logo? (pedir o arquivo em PNG com fundo transparente, se possível)
10. Cores principais (pelo menos uma cor escura e uma clara, em hexadecimal, se houver).
11. Tem fotos do local para usar no site e na placa? (pedir pelo menos uma foto da fachada ou do ambiente)

## 3. Regras do cartão

12. Como se ganha selo: por visita com gasto mínimo (restaurante e bar) ou por estadia (pousada)?
13. Gasto mínimo por visita. Padrão do piloto: R$ 15,00 (restaurante) ou R$ 20,00 (bar). Pousada não tem gasto mínimo.
14. Plano dos moradores: quantos selos e qual recompensa? Padrão: 10 selos = 1 prato.
15. Plano dos turistas: quantos selos e qual recompensa? Padrão: 5 selos = 1 sobremesa. A recompensa do turista deve ser menor que a do morador.
16. Dias sem visita para marcar cliente como inativo. Padrão: 30. Para pousada, marcar "Sem limite".
17. Limite de mensagens automáticas por cliente por semana. Padrão: 1.

## 4. Piloto e combinados

18. Piloto gratuito por quanto tempo? Padrão: 30 dias de uso gratuito, depois o plano escolhido (ou o piloto de até 3 meses, conforme combinado).
19. Termo de piloto aceito por escrito? (sim / não / quando)
20. Data prevista de feedback ao final do piloto.
21. Autoriza citar o caso publicamente (site, apresentações)? Só com autorização por escrito.
22. Condições comerciais combinadas: implantação e mensalidade. Padrão para o piloto: implantação R$ 299,90; mensalidade R$ 39,90 + R$ 1,00 por selo. **Confirme com o Juan antes de aceitar qualquer valor diferente.**

## 5. Divulgação

23. Quem é o público que vai receber a mensagem de WhatsApp? (clientes já cadastrados, clientes etiquetados, quem está chegando?)
24. Tem lista de contatos para o envio? (lista de transmissão, sem nome por nome)
25. Texto da placa: frase de chamada além de "Ganhe seu cartão fidelidade"? (opcional)
26. Vai ter case no site da Bicuíra? (sim / não). Se sim, precisa das fotos reais e de autorização (pergunta 21).

---

## Depois das respostas: sequência de trabalho

1. Salvar as respostas em `docs/clientes/<slug>.md`.
2. Mostrar o resumo ao Juan e pedir confirmação antes de criar qualquer coisa.
3. Seguir `docs/ONBOARDING-ESTABELECIMENTO.md`: seção 1 (criar), 2 (login), 3 (QR), 4 (tema, se houver logo e cores), 5 (conferência), 6 (materiais).
4. Se o cliente não tiver logo ou cores, usar o tema `basico` e avisar.
5. Antes de entregar, rodar a conferência da seção 5 do roteiro de onboarding.

## Modelo de ficha: `docs/clientes/<slug>.md`

```markdown
# <Nome do estabelecimento>

- Slug: 
- Tipo: restaurante / bar / pousada
- Cidade e bairro: 
- Instagram: 
- Dono / painel: nome, e-mail, telefone
- Contato de privacidade (LGPD): 
- Logo: sim / não
- Cores: 
- Fotos: sim / não

## Regras do cartão
- Como ganha selo: 
- Gasto mínimo: 
- Morador: selos e recompensa 
- Turista: selos e recompensa 
- Inativo após (dias): 
- Mensagens por semana: 

## Piloto
- Termo aceito por escrito: 
- Início: 
- Feedback previsto: 
- Autoriza citar o caso: 
- Implantação / mensalidade combinadas: 

## Divulgação
- Público da mensagem: 
- Lista de envio: 
- Frase da placa: 
- Case no site: sim / não

## Status
- [ ] Estabelecimento criado (/admin)
- [ ] Login do dono criado
- [ ] QR testado no celular
- [ ] Tema próprio (se houver)
- [ ] Conferência final
- [ ] Case no site (se houver)
- [ ] Placa 10x15 impressa
- [ ] Mensagem de WhatsApp enviada
```
