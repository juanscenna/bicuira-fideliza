// Gera a placa 10x15 cm (PDF vetorial + PNG) da Pousada Sonhos do Rosa.
// Uso: node gerar.mjs  (precisa de playwright-core e qrcode)
import { chromium } from 'playwright-core';
import QRCode from 'qrcode';
import { readFileSync, writeFileSync } from 'node:fs';
const URL = 'https://bicuira-fideliza.vercel.app/pousadasonhosdorosa';
const pub = '../../../public/temas/sonhos-do-rosa/';
const img = f => 'data:image/png;base64,' + readFileSync(pub + f).toString('base64');
const qr = await QRCode.toString(URL, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#2F2115', light: '#FFFFFF' } });
const html = readFileSync('placa.html', 'utf8')
  .replaceAll('{{LOGO}}', img('logo.png')).replaceAll('{{SELO}}', img('selo-160.png')).replaceAll('{{SELO_CINZA}}', img('selo-cinza-160.png'))
  .replace('{{QR}}', qr.replace('<svg', '<svg class="qr"'));
writeFileSync('placa.build.html', html);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 378, height: 567 }, deviceScaleFactor: 4 });
await p.setContent(html, { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);
await p.screenshot({ path: '../placa-sonhos-do-rosa-10x15.png' });
await p.pdf({ path: '../placa-sonhos-do-rosa-10x15.pdf', width: '10cm', height: '15cm', printBackground: true, pageRanges: '1' });
await b.close();
