import type { UserPreferences } from '@/lib/preferences/types';

export type MigrationContext = {
  userId: string;
};

export type Migration = {
  id: string;
  version: number;
  run: (context: MigrationContext) => Promise<void>;
};

export type MigrationResult = {
  applied: string[];
  skipped: string[];
  currentVersion: number;
};

const CURRENT_SCHEMA_VERSION = 1;

export async function runMigrations(
  migrations: Migration[],
  getStoredVersion: () => Promise<number>,
  setStoredVersion: (version: number) => Promise<void>,
  context: MigrationContext,
): Promise<MigrationResult> {
  const applied: string[] = [];
  const skipped: string[] = [];

  let currentVersion = await getStoredVersion();

  const pending = migrations
    .filter((migration) => migration.version > currentVersion)
    .sort((a, b) => a.version - b.version);

  for (const migration of pending) {
    try {
      await migration.run(context);
      currentVersion = migration.version;
      await setStoredVersion(currentVersion);
      applied.push(migration.id);
    } catch {
      skipped.push(migration.id);
      break;
    }
  }

  return {
    applied,
    skipped,
    currentVersion,
  };
}

export { CURRENT_SCHEMA_VERSION };

export function withDefaults<T extends Record<string, unknown>>(
  value: Partial<T> | null | undefined,
  defaults: T,
): T {
  return { ...defaults, ...(value ?? {}) };
}

export function migrateUserPreferences(
  raw: Partial<UserPreferences> | null | undefined,
  defaults: UserPreferences,
): UserPreferences {
  return withDefaults(raw, defaults);
}
