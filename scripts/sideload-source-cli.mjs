import { readFileSync, statSync, writeFileSync } from 'node:fs';

import { SOURCE_PATH, addRelease, nextBuildNumber } from './sideload-source.ts';

function readSource() {
  return JSON.parse(readFileSync(SOURCE_PATH, 'utf8'));
}

function marketingVersion() {
  const app = JSON.parse(readFileSync('app.json', 'utf8'));
  const version = app.expo?.version;
  if (!/^\d+\.\d+\.\d+$/.test(version ?? '')) {
    throw new Error('expo.version em app.json tem de ser maior.menor.correção.');
  }
  return version;
}

const command = process.argv[2];
if (command === 'plan') {
  const tags = (process.argv[3] ?? '').split(/\s+/).filter(Boolean);
  const buildNumber = nextBuildNumber(readSource(), tags);
  process.stdout.write(`marketing_version=${marketingVersion()}\nbuild_number=${buildNumber}\n`);
} else if (command === 'record') {
  const ipa = process.argv[3];
  const marketing = process.argv[4];
  const buildNumber = Number(process.argv[5]);
  const date = process.argv[6];
  if (!ipa || !marketing || !date) throw new Error('Faltam argumentos para gravar a fonte.');
  const updated = addRelease(readSource(), {
    marketingVersion: marketing,
    buildNumber,
    date,
    size: statSync(ipa).size,
  });
  writeFileSync(SOURCE_PATH, `${JSON.stringify(updated, null, 2)}\n`);
} else {
  throw new Error('Comando desconhecido. Usa plan ou record.');
}
