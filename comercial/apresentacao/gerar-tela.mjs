// Gera a versão para apresentar na tela (slides 16:10 em rolagem) a partir de apresentacao-tela.html.
// Saída: Bicuira-Fideliza-Apresentacao-Tela.html, um arquivo só (imagens e fontes embutidas), abre offline.
// Uso: node gerar-tela.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const MIME = { '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff' };
const dataUri = (f) => `data:${MIME[extname(f)]};base64,${readFileSync(join(dir, f)).toString('base64')}`;

let html = readFileSync(join(dir, 'apresentacao-tela.html'), 'utf8');
const fontesCss = readFileSync(join(dir, 'fontes/g.css'), 'utf8').replace(/url\((f\d\.woff2)\)/g, (_, f) => `url(${dataUri('fontes/' + f)})`);
html = html.replace('<link rel="stylesheet" href="fontes/g.css">', `<style>${fontesCss}</style>`);
html = html.replace(/url\(((?:fontes|img)\/[^)]+)\)/g, (_, f) => `url(${dataUri(f)})`);
html = html.replace(/src="(img\/[^"]+)"/g, (_, f) => `src="${dataUri(f)}"`);
writeFileSync(join(dir, 'Bicuira-Fideliza-Apresentacao-Tela.html'), html);
console.log('ok', (html.length / 1e6).toFixed(1) + ' MB');
