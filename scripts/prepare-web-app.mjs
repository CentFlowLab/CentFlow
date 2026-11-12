// Ajusta a exportação web (dist/) para viver em miven.pt/app no GitHub Pages (ADR-037).
// Uso (no CI, depois de `expo export --platform web` com experiments.baseUrl = "/app"):
//   node scripts/prepare-web-app.mjs dist /app
// - desinstala o coi-serviceworker de versões anteriores: a base de dados web já não precisa de
//   isolamento cross-origin (ADR-060) e o service worker obrigava a recarregar a página;
// - aponta o manifesto e os ícones para o prefixo;
// - restaura o caminho guardado pelo 404.html do site (links profundos numa SPA no Pages).
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [dir = 'dist', base = '/app'] = process.argv.slice(2);
const indexPath = join(dir, 'index.html');
let html = readFileSync(indexPath, 'utf8');

const restore = `<script>(function(){try{var p=sessionStorage.getItem('miven:spa-path');if(p){sessionStorage.removeItem('miven:spa-path');history.replaceState(null,'',p);}}catch(e){}})();</script>`;
// Só para remover o service worker antigo de quem já o tem; não regista nada novo.
const coi = `<script>window.coi={shouldRegister:function(){return false},shouldDeregister:function(){return true},quiet:true};</script><script src="${base}/coi-serviceworker.min.js"></script>`;

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
