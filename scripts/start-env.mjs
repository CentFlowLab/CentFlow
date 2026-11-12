// Arranca o Expo num ambiente explícito (docs/ambientes.md):
//   node scripts/start-env.mjs staging [--web] [outros argumentos do expo start]
//   node scripts/start-env.mjs local   [--web]   (sem servidor: só dados de teste no aparelho)
//   node scripts/start-env.mjs production [--web] (dados reais: só quando é mesmo preciso)
// O Expo carrega `.env.local` sozinho (produção); aqui isso é desligado e as variáveis vêm do
// ficheiro do ambiente escolhido, para que testar nunca use dados reais por engano.
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const [target, ...rest] = process.argv.slice(2);
const files = { staging: '.env.staging', production: '.env.local' };

if (!['staging', 'local', 'production'].includes(target ?? '')) {
  console.error('Uso: node scripts/start-env.mjs <staging|local|production> [--web] [...]');
  process.exit(1);
}

const env = { ...process.env, EXPO_NO_DOTENV: '1' };
if (target === 'local') {
  env.EXPO_PUBLIC_SUPABASE_URL = '';
  env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = '';
} else {
  const file = files[target];
  if (!existsSync(file)) {
    console.error(`Falta ${file}. Ver docs/ambientes.md (secção "Desenvolvimento local").`);
    process.exit(1);
  }
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
  if (
    /service_role|secret/i.test(
      Object.keys(env)
        .filter((key) => key.startsWith('EXPO_PUBLIC_'))
        .join(' '),
    )
  ) {
    console.error('Uma variável pública parece uma chave secreta. Parado.');
    process.exit(1);
  }
  const url = env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  const expected = target === 'staging' ? 'qlimqcgrgaqzwjmafora' : 'slfgslfzolfvqavuccom';
  if (!url.includes(expected)) {
    console.error(`${file} não aponta para o projeto de ${target}. Parado.`);
    process.exit(1);
  }
}
if (target !== 'production') env.APP_VARIANT = 'preview';
if (target === 'production') console.warn('Atenção: dados REAIS de produção.');

const child = spawn('npx', ['expo', 'start', ...rest], { stdio: 'inherit', shell: true, env });
child.on('exit', (code) => process.exit(code ?? 0));
