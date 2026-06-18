import { secureStorage, SECURE_KEYS } from '@/lib/security/secureStorage';

import { onboardingMigrations } from './onboardingMigrations';
import { profileMigrations } from './profileMigrations';
import { runMigrations, type MigrationResult } from './migrationRunner';
import { settingsMigrations } from './settingsMigrations';

const ALL_MIGRATIONS = [...profileMigrations, ...onboardingMigrations, ...settingsMigrations].sort(
  (a, b) => a.version - b.version,
);

async function getStoredVersion(): Promise<number> {
  const raw = await secureStorage.getItem(SECURE_KEYS.migrationVersion);
  const parsed = raw ? parseInt(raw, 10) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

async function setStoredVersion(version: number): Promise<void> {
  await secureStorage.setItem(SECURE_KEYS.migrationVersion, String(version));
}

export async function runAllDataMigrations(userId: string): Promise<MigrationResult> {
  return runMigrations(ALL_MIGRATIONS, getStoredVersion, setStoredVersion, { userId });
}

export { migrateUserPreferences, withDefaults, runMigrations } from './migrationRunner';
