#!/usr/bin/env node
/**
 * Configura secrets Resend no Supabase e faz deploy de send-email + email-jobs.
 *
 * 1. cp supabase/secrets.env.example supabase/secrets.env
 * 2. Coloca RESEND_API_KEY=re_... em supabase/secrets.env
 * 3. npm run email:setup
 */
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT_REF = 'oxhjfwmhcwadlltinlck';
const SECRETS_EXAMPLE = path.join(ROOT, 'supabase', 'secrets.env.example');
const SECRETS_FILE = path.join(ROOT, 'supabase', 'secrets.env');

const SANDBOX_FROM = 'CentFlow <onboarding@resend.dev>';

function log(msg) {
  console.log(msg);
}

function fail(msg) {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}

function runSupabase(args, { allowFail = false } = {}) {
  const result = spawnSync('npx', ['supabase', ...args], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0 && !allowFail) {
    fail(`supabase ${args.join(' ')} falhou (código ${result.status ?? 'unknown'}).`);
  }
  return result.status === 0;
}

function parseEnvFile(content) {
  const lines = content.split(/\r?\n/);
  const entries = [];
  const map = new Map();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      entries.push({ type: 'raw', line });
      continue;
    }
    const eq = trimmed.indexOf('=');
    if (eq === -1) {
      entries.push({ type: 'raw', line });
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    entries.push({ type: 'kv', key, value });
    map.set(key, value);
  }
  return { entries, map };
}

function serializeEnvFile(entries) {
  return `${entries.map((entry) => {
    if (entry.type === 'raw') return entry.line;
    return `${entry.key}=${entry.value}`;
  }).join('\n')}\n`;
}

function ensureSecretsFile() {
  if (!existsSync(SECRETS_FILE)) {
    if (!existsSync(SECRETS_EXAMPLE)) {
      fail('Falta supabase/secrets.env.example');
    }
    copyFileSync(SECRETS_EXAMPLE, SECRETS_FILE);
    log(`\n→ Criado ${path.relative(ROOT, SECRETS_FILE)} a partir do example.`);
    log('  Edita o ficheiro e coloca a tua RESEND_API_KEY, depois corre outra vez:\n');
    log('  npm run email:setup\n');
    process.exit(0);
  }
}

function resolveEmailFrom(map) {
  const mode = (map.get('EMAIL_MODE') ?? 'sandbox').toLowerCase();
  if (mode === 'sandbox' || mode === 'test') {
    return SANDBOX_FROM;
  }
  return map.get('EMAIL_FROM') ?? 'CentFlow <noreply@mail.centflow.app>';
}

function ensureCronSecret(entries, map) {
  let cron = map.get('EMAIL_CRON_SECRET') ?? '';
  if (cron) return cron;

  cron = randomBytes(32).toString('base64url');
  for (const entry of entries) {
    if (entry.type === 'kv' && entry.key === 'EMAIL_CRON_SECRET') {
      entry.value = cron;
    }
  }
  writeFileSync(SECRETS_FILE, serializeEnvFile(entries), 'utf8');
  log(`→ EMAIL_CRON_SECRET gerado e guardado em supabase/secrets.env`);
  return cron;
}

function buildDeployEnv(map, emailFrom) {
  const resendKey = map.get('RESEND_API_KEY') ?? '';
  const cron = map.get('EMAIL_CRON_SECRET') ?? '';

  if (!resendKey || resendKey === 're_COLOCA_AQUI' || !resendKey.startsWith('re_')) {
    fail(
      'RESEND_API_KEY inválida ou em falta em supabase/secrets.env.\n' +
        '  Obtém em https://resend.com/api-keys e cola re_... no ficheiro.',
    );
  }

  if (!cron) {
    fail('EMAIL_CRON_SECRET em falta — corre npm run email:setup outra vez.');
  }

  return {
    RESEND_API_KEY: resendKey,
    EMAIL_FROM: emailFrom,
    EMAIL_CRON_SECRET: cron,
  };
}

function writeDeployEnvFile(env) {
  const deployPath = path.join(ROOT, 'supabase', '.secrets.deploy.env');
  const body = Object.entries(env)
    .map(([k, v]) => `${k}=${v.includes(' ') ? `"${v.replace(/"/g, '\\"')}"` : v}`)
    .join('\n');
  writeFileSync(deployPath, `${body}\n`, 'utf8');
  return deployPath;
}

function main() {
  log('\nCentFlow — setup Resend + email functions\n');

  ensureSecretsFile();

  const raw = readFileSync(SECRETS_FILE, 'utf8');
  const { entries, map } = parseEnvFile(raw);

  ensureCronSecret(entries, map);
  const refreshed = existsSync(SECRETS_FILE) ? parseEnvFile(readFileSync(SECRETS_FILE, 'utf8')).map : map;

  const emailFrom = resolveEmailFrom(refreshed);
  log(`→ EMAIL_FROM efectivo: ${emailFrom}`);

  const deployEnv = buildDeployEnv(refreshed, emailFrom);
  const deployFile = writeDeployEnvFile(deployEnv);

  log('\n→ A ligar projecto Supabase...');
  runSupabase(['link', '--project-ref', PROJECT_REF], { allowFail: true });

  log('\n→ A publicar secrets (Resend) no Supabase...');
  runSupabase(['secrets', 'set', '--env-file', deployFile]);

  log('\n→ A fazer deploy das Edge Functions send-email e email-jobs...');
  runSupabase(['functions', 'deploy', 'send-email']);
  runSupabase(['functions', 'deploy', 'email-jobs']);

  log('\n✓ Setup concluído.');
  log('\nPróximos passos:');
  log('  • Teste: Perfil → CentFlow Doctor → envio real → Boas-vindas');
  if (emailFrom.includes('resend.dev')) {
    log('  • Modo sandbox: só recebes email se a conta da app = email da conta Resend');
    log('  • Produção: verifica mail.centflow.app no Resend e muda EMAIL_MODE=production');
  }
  log(`  • Cron secret (GitHub Actions): guarda EMAIL_CRON_SECRET para o workflow email-jobs`);
  log('');
}

main();
