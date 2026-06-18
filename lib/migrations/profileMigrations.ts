import { loadStoredProfile, saveStoredProfile } from '@/lib/preferences/storage';

import type { Migration } from './migrationRunner';

/** Garante campos de perfil em dados antigos. */
export const profileMigrations: Migration[] = [
  {
    id: 'profile-v1-defaults',
    version: 1,
    async run({ userId }) {
      const overlay = await loadStoredProfile(userId);
      if (!overlay) return;

      await saveStoredProfile(userId, {
        ...overlay,
        currency: overlay.currency ?? 'EUR',
      });
    },
  },
];
