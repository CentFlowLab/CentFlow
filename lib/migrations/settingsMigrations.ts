import { DEFAULT_PREFERENCES } from '@/lib/preferences/config';
import { loadStoredPreferences, saveStoredPreferences } from '@/lib/preferences/storage';

import { migrateUserPreferences, type Migration } from './migrationRunner';

export const settingsMigrations: Migration[] = [
  {
    id: 'settings-v1-defaults',
    version: 1,
    async run({ userId }) {
      const raw = await loadStoredPreferences(userId);
      const migrated = migrateUserPreferences(raw, DEFAULT_PREFERENCES);
      await saveStoredPreferences(userId, migrated);
    },
  },
];
