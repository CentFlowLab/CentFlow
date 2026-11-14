// node scripts/site-cache-bust.mjs [site]
// Versiona os endereços de CSS, JS, imagens e fontes de miven.pt pelo conteúdo (ver site-assets.ts).
// Primeiro os CSS (as fontes que referenciam), depois os HTML (que referenciam os CSS já alterados).
// A app web (/app) já tem nomes com hash e fica de fora. Falha se um endereço apontar para nada.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { assetRefs, versionAssetRefs } from './site-assets.ts';

const root = process.argv[2] ?? 'site';

function walk(dir, ext) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (path === join(root, 'app')) continue;
    if (statSync(path).isDirectory()) out.push(...walk(path, ext));
    else if (name.endsWith(ext)) out.push(path);
  }
  return out;
}

const missing = new Set();
function versionOf(ref) {
  const file = join(root, ref);
  if (!existsSync(file)) {
    missing.add(ref);
    return null;
  }
  return createHash('sha256').update(readFileSync(file)).digest('hex').slice(0, 10);
}

let changed = 0;
for (const file of [...walk(join(root, 'assets'), '.css'), ...walk(root, '.html')]) {
  const text = readFileSync(file, 'utf8');
  if (assetRefs(text).length === 0) continue;
  const next = versionAssetRefs(text, versionOf);
  if (next !== text) {
    writeFileSync(file, next);
    changed += 1;
  }
}

if (missing.size > 0) {
  console.error(`Endereços sem ficheiro em ${root}: ${[...missing].sort().join(', ')}`);
  process.exit(1);
}
console.log(`Endereços versionados em ${changed} ficheiros.`);
