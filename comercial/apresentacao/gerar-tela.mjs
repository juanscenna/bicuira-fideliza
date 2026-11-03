// Gera a versão para apresentar na tela (16:10, MacBook/desktop) a partir de apresentacao.html.
// Saída: Bicuira-Fideliza-Apresentacao-Tela.html, um arquivo só (imagens e fontes embutidas), abre offline.
// Uso: node gerar-tela.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const MIME = { '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff' };
const dataUri = (f) => `data:${MIME[extname(f)]};base64,${readFileSync(join(dir, f)).toString('base64')}`;

let html = readFileSync(join(dir, 'apresentacao.html'), 'utf8');

// fontes: g.css vira <style> com as fontes embutidas
const fontesCss = readFileSync(join(dir, 'fontes/g.css'), 'utf8').replace(/url\((f\d\.woff2)\)/g, (_, f) => `url(${dataUri('fontes/' + f)})`);
html = html.replace('<link rel="stylesheet" href="fontes/g.css">', `<style>${fontesCss}</style>`);
html = html.replace(/url\((fontes\/[^)]+)\)/g, (_, f) => `url(${dataUri(f)})`);
html = html.replace(/src="(img\/[^"]+)"/g, (_, f) => `src="${dataUri(f)}"`);

const css = `<style>
/* ── Modo tela: slide 16:10 (MacBook), um por vez, escalado para caber ── */
@page{size:320mm 200mm;margin:0}
.p{width:320mm;height:200mm}
@media screen{
  html,body{height:100%;overflow:hidden;background:#151716}
  .p{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) scale(var(--s,1));opacity:0;visibility:hidden;transition:opacity .3s,visibility 0s .3s}
  .p.on{opacity:1;visibility:visible;transition:opacity .3s}
  .nav{position:fixed;right:18px;bottom:14px;display:flex;align-items:center;gap:10px;font:600 13px Sora,sans-serif;color:#F2EBDD;opacity:0;transition:opacity .4s;z-index:9}
  .nav.vis{opacity:.85}
  .nav button{all:unset;cursor:pointer;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:rgba(242,235,221,.14)}
  .nav button:hover{background:rgba(242,235,221,.28)}
  .barra{position:fixed;left:0;bottom:0;height:3px;background:#B4CD64;transition:width .3s;z-index:9}
  .dica{position:fixed;left:50%;top:16px;transform:translateX(-50%);font:600 13px Sora,sans-serif;color:#F2EBDD;background:rgba(0,0,0,.55);padding:8px 16px;border-radius:99px;transition:opacity .6s;z-index:9}
  body.mouse-off{cursor:none}
}
@media screen and (prefers-reduced-motion:reduce){.p,.p.on,.barra{transition:none}}
@media print{.nav,.barra,.dica{display:none}}
</style>`;

const js = `<div class="nav"><button id="ant" aria-label="Anterior">‹</button><span id="num"></span><button id="prox" aria-label="Próximo">›</button><button id="cheia" aria-label="Tela cheia">⤢</button></div>
<div class="barra"></div>
<p class="dica">← → para passar · F para tela cheia</p>
<script>
(() => {
  const S = [...document.querySelectorAll('section.p')], n = S.length;
  const nav = document.querySelector('.nav'), barra = document.querySelector('.barra'), num = document.getElementById('num');
  let i = Math.min(Math.max(parseInt(location.hash.slice(1)) - 1 || 0, 0), n - 1);
  const ajustar = () => {
    const w = S[0].offsetWidth, h = S[0].offsetHeight;
    document.documentElement.style.setProperty('--s', Math.min(innerWidth / w, innerHeight / h));
  };
  const ir = (k) => {
    i = Math.min(Math.max(k, 0), n - 1);
    S.forEach((s, j) => s.classList.toggle('on', j === i));
    num.textContent = (i + 1) + ' / ' + n;
    barra.style.width = ((i + 1) / n * 100) + '%';
    history.replaceState(null, '', '#' + (i + 1));
  };
  const cheia = () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.();
  addEventListener('keydown', (e) => {
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(e.key)) { e.preventDefault(); ir(i + 1); }
    else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); ir(i - 1); }
    else if (e.key === 'Home') ir(0);
    else if (e.key === 'End') ir(n - 1);
    else if (e.key === 'f' || e.key === 'F') cheia();
  });
  addEventListener('click', (e) => {
    if (e.target.closest('.nav')) return;
    ir(e.clientX < innerWidth * 0.3 ? i - 1 : i + 1);
  });
  let x0 = null;
  addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  addEventListener('touchend', (e) => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) ir(i + (dx < 0 ? 1 : -1)); x0 = null; });
  document.getElementById('ant').onclick = () => ir(i - 1);
  document.getElementById('prox').onclick = () => ir(i + 1);
  document.getElementById('cheia').onclick = cheia;
  let t;
  addEventListener('mousemove', () => {
    nav.classList.add('vis'); document.body.classList.remove('mouse-off');
    clearTimeout(t); t = setTimeout(() => { nav.classList.remove('vis'); document.body.classList.add('mouse-off'); }, 2000);
  });
  setTimeout(() => { document.querySelector('.dica').style.opacity = 0; }, 3500);
  addEventListener('resize', ajustar);
  ajustar(); ir(i);
})();
</script>`;

html = html.replace('</head>', css + '\n</head>').replace(/<\/body>\s*<\/html>\s*$/, js + '\n</body>\n</html>\n');
html = html.replace('<title>Bicuíra Fideliza · Apresentação comercial</title>', '<title>Bicuíra Fideliza · Apresentação</title>');
writeFileSync(join(dir, 'Bicuira-Fideliza-Apresentacao-Tela.html'), html);
console.log('ok', (html.length / 1e6).toFixed(1) + ' MB');
