#!/usr/bin/env node
/**
 * Cursor hook: regenera HANDOFF.md após edições relevantes.
 * Evita loop infinito ignorando edições no próprio HANDOFF.md.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../..');

const RELEVANT_PATTERN =
  /(?:^|[/\\])(app|lib|components|hooks|scripts)(?:[/\\]|$)|package\.json$|handoff\.config\.json$/i;

const IGNORE_PATTERN = /HANDOFF\.md$/i;

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf-8').trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return { raw };
  }
}

function extractEditedPaths(input) {
  const paths = new Set();

  const candidates = [
    input.file_path,
    input.path,
    input.filePath,
    input.uri,
    input.file,
  ];

  for (const value of candidates) {
    if (typeof value === 'string' && value.length > 0) {
      paths.add(value.replace(/\\/g, '/'));
    }
  }

  if (Array.isArray(input.edits)) {
    for (const edit of input.edits) {
      if (edit?.file_path) paths.add(String(edit.file_path).replace(/\\/g, '/'));
    }
  }

  if (Array.isArray(input.files)) {
    for (const file of input.files) {
      if (typeof file === 'string') paths.add(file.replace(/\\/g, '/'));
    }
  }

  // Se não conseguirmos detetar o ficheiro, regenera por segurança
  if (paths.size === 0) paths.add('__unknown__');

  return [...paths];
}

function shouldRegenerate(editedPaths) {
  for (const filePath of editedPaths) {
    if (IGNORE_PATTERN.test(filePath)) return false;
    if (filePath === '__unknown__') return true;
    if (RELEVANT_PATTERN.test(filePath)) return true;
  }
  return false;
}

function runHandoff() {
  const pkgPath = path.join(PROJECT_ROOT, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    console.error('update-handoff: package.json não encontrado');
    return 1;
  }

  const result = spawnSync('npm', ['run', 'handoff', '--silent'], {
    cwd: PROJECT_ROOT,
    shell: true,
    encoding: 'utf-8',
    timeout: 30_000,
  });

  if (result.status !== 0) {
    console.error('update-handoff: falhou', result.stderr || result.stdout);
    return result.status ?? 1;
  }

  if (result.stdout?.trim()) {
    console.log(result.stdout.trim());
  }

  return 0;
}

const input = await readStdin();
const editedPaths = extractEditedPaths(input);

if (shouldRegenerate(editedPaths)) {
  process.exit(runHandoff());
}

process.exit(0);
