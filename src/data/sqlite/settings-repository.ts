import { ACCOUNT_SETTING_IDS, ACCOUNT_SETTINGS, type AccountSetting } from '@/core/finance';

import type { SettingsRepository } from '../repositories/types';
import { write, type SqliteRepositoryContext } from './context';

function assertKey(key: string): asserts key is AccountSetting {
  if (!(ACCOUNT_SETTINGS as readonly string[]).includes(key)) {
    throw new Error(`Unknown account setting: ${key}`);
  }
}

/** Definições da conta (ADR-079): uma linha por chave, sincronizada pela fila normal. */
export function createSqliteSettingsRepository(
  context: SqliteRepositoryContext,
): SettingsRepository {
  const { db } = context;
  return {
    async get(key) {
      assertKey(key);
      const row = await db.first<{ value: string }>(
        'SELECT value FROM user_settings WHERE key = ? AND deleted_at IS NULL',
        [key],
      );
      return row?.value ?? null;
    },

    set(key, value) {
      assertKey(key);
      return write(context, ['user_settings'], () =>
        db.transaction(async (tx) => {
          const current = await tx.first<{ value: string; deleted_at: string | null }>(
            'SELECT value, deleted_at FROM user_settings WHERE id = ?',
            [ACCOUNT_SETTING_IDS[key]],
          );
          if (current && current.deleted_at === null && current.value === value) return;
          const timestamp = context.now();
          if (current) {
            await tx.run(
              'UPDATE user_settings SET value = ?, deleted_at = NULL, updated_at = ? WHERE id = ?',
              [value, timestamp, ACCOUNT_SETTING_IDS[key]],
            );
          } else {
            await tx.run(
              `INSERT INTO user_settings (id, key, value, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?)`,
              [ACCOUNT_SETTING_IDS[key], key, value, timestamp, timestamp],
            );
          }
        }),
      );
    },
  };
}
