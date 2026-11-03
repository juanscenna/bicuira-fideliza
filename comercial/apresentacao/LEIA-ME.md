# Apresentação comercial — Bicuíra Fideliza

- Fonte editável: `apresentacao.html` · PDF gerado: `Bicuira-Fideliza-Apresentacao.pdf` (A4 paisagem)
- Para trocar uma imagem, substitua o arquivo em `img/` mantendo o mesmo nome
  (ex.: `img/cartao.png`, `img/painel-pc-metricas.png`, `img/salao-1600.webp`).
- Campos a preencher: `[PRAZO]` (pág. 13), `[SOBRENOME]` (pág. 14), números e depoimento do case (pág. 9).
- Os prints do painel usam dados fictícios de demonstração.
- Regerar o PDF: abrir o HTML no Chrome → Imprimir → Salvar como PDF (paisagem, sem margens, com gráficos de fundo).

## Versão para apresentar na tela (MacBook / desktop)
- `Bicuira-Fideliza-Apresentacao-Tela.html`: um arquivo só (imagens e fontes embutidas), abre offline em qualquer navegador.
- Slides em 16:10, um por vez, ajustados ao tamanho da tela.
- Navegação: ← → (ou espaço / clique), F para tela cheia, Home/End para início e fim. O número do slide fica no endereço (`#5`).
- Regerar depois de editar `apresentacao.html`: `node gerar-tela.mjs`
