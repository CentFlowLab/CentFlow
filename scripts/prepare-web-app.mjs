// Ajusta a exportação web (dist/) para viver em miven.pt/app no GitHub Pages (ADR-037).
// Uso (no CI, depois de `expo export --platform web` com experiments.baseUrl = "/app"):
//   node scripts/prepare-web-app.mjs dist /app
// - liga o coi-serviceworker (o GitHub Pages não envia COOP/COEP; o expo-sqlite precisa deles);
// - aponta o manifesto e os ícones para o prefixo;
// - restaura o caminho guardado pelo 404.html do site (links profundos numa SPA no Pages).
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [dir = 'dist', base = '/app'] = process.argv.slice(2);
const indexPath = join(dir, 'index.html');
let html = readFileSync(indexPath, 'utf8');

const restore = `<script>(function(){try{var p=sessionStorage.getItem('miven:spa-path');if(p){sessionStorage.removeItem('miven:spa-path');history.replaceState(null,'',p);}}catch(e){}})();</script>`;
const coi = `<script src="${base}/coi-serviceworker.min.js"></script>`;

if (html.includes('coi-serviceworker')) throw new Error('index.html já foi preparado.');
html = html
  .replace('<head>', `<head>\n    ${restore}\n    ${coi}`)
  .replace('href="/manifest.json"', `href="${base}/manifest.json"`)
  .replace('href="/icons/apple-touch-icon.png"', `href="${base}/icons/apple-touch-icon.png"`);
writeFileSync(indexPath, html);

const manifestPath = join(dir, 'manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
manifest.id = `${base}/`;
manifest.start_url = `${base}/`;
manifest.scope = `${base}/`;
manifest.icons = manifest.icons.map((icon) => ({ ...icon, src: `${base}${icon.src}` }));
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`App web preparada em ${dir} para ${base}.`);
