import Constants from 'expo-constants';
import { useEffect } from 'react';

import { useRepositories, type Repositories } from '@/data';

import { listAutoBackups, saveAutoBackup } from './backup-files';

/** Uma cópia automática por semana, no próprio aparelho (as 5 mais recentes). */
export const AUTO_BACKUP_EVERY_MS = 7 * 24 * 60 * 60 * 1000;
/** Só depois do arranque, para não atrasar a abertura da app. */
const START_DELAY_MS = 15_000;

export function autoBackupName(now: Date): string {
  return `miven-auto-${now.toISOString().replace(/[:.]/g, '-')}.json`;
}

export async function runAutoBackup(
  repositories: Repositories,
  now = new Date(),
  { force = false } = {},
): Promise<boolean> {
  const [latest] = await listAutoBackups();
  if (latest && !force) {
    const when = Date.parse(latest.createdAt.replace(/-(\d{2})-(\d{2})-(\d{3})Z$/, ':$1:$2.$3Z'));
    if (Number.isFinite(when) && now.getTime() - when < AUTO_BACKUP_EVERY_MS) return false;
  }
  const backup = await repositories.backup.exportData(Constants.expoConfig?.version ?? '');
  await saveAutoBackup(autoBackupName(now), JSON.stringify(backup));
  return true;
}

/** Montado dentro da base de dados aberta: corre uma vez por sessão, sem interface. */
export function AutoBackup() {
  const repositories = useRepositories();
  useEffect(() => {
    const timer = setTimeout(() => {
      // Falhas (sem espaço, sem armazenamento) não incomodam: a cópia manual continua disponível.
      void runAutoBackup(repositories).catch(() => undefined);
    }, START_DELAY_MS);
    return () => clearTimeout(timer);
  }, [repositories]);
  return null;
}
