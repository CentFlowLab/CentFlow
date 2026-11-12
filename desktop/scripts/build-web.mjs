// Exporta a app web para desktop/web (servida pelo protocolo app://miven do Electron).
//   node scripts/build-web.mjs              → "Miven Teste" contra o staging (por omissão)
//   node scripts/build-web.mjs --production → a app real, contra a produção
// As variáveis vêm de ../.env.staging ou ../.env.local (só chaves publicáveis), nunca do ambiente.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const production = process.argv.includes('--production');
const file = join(root, production ? '.env.local' : '.env.staging');
const expected = production ? 'slfgslfzolfvqavuccom' : 'qlimqcgrgaqzwjmafora';

if (!existsSync(file)) {
  console.error(`Falta ${file}. Ver docs/ambientes.md.`);
  process.exit(1);
}
const env = { ...process.env, EXPO_NO_DOTENV: '1' };
for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
  const match = /^\s*(EXPO_PUBLIC_[A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
  if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, '');
}
if (!(env.EXPO_PUBLIC_SUPABASE_URL ?? '').includes(expected)) {
  console.error(`${file} não aponta para o projeto esperado (${expected}).`);
  process.exit(1);
}
if (!production) env.APP_VARIANT = 'preview';

const out = join(root, 'desktop', 'web');
rmSync(out, { recursive: true, force: true });
const result = spawnSync('npx', ['expo', 'export', '--platform', 'web', '--output-dir', out], {
  cwd: root,
  env,
  stdio: 'inherit',
  shell: true,
});
if (result.status !== 0) process.exit(result.status ?? 1);
console.log(
  `Web exportada para desktop/web (${production ? 'produção' : 'staging, Miven Teste'}).`,
);
