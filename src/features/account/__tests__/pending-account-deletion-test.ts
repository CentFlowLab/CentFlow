import { createMemoryStore } from '@/lib/storage/key-value-store';

import {
  markPendingAccountDeletion,
  readPendingAccountDeletion,
  resumePendingAccountDeletion,
} from '../pending-account-deletion';

const USER = '00000000-0000-4000-8000-00000000000a';

describe('pending account deletion', () => {
  it('removes the local database on the next start after an interrupted cleanup', async () => {
    const storage = createMemoryStore();
    const signedOut: string[] = [];
    const deleted: string[] = [];
    await markPendingAccountDeletion(storage, USER);

    await expect(
      resumePendingAccountDeletion({
        storage,
        currentUserId: USER,
        signOut: async () => {
          signedOut.push(USER);
        },
        deleteSpace: async () => {
          throw new Error('interrupted');
        },
      }),
    ).rejects.toThrow(/interrupted/);
    expect(signedOut).toEqual([USER]);
    expect(deleted).toEqual([]);
    expect(await readPendingAccountDeletion(storage)).toEqual({ userId: USER, phase: 'local' });

    await resumePendingAccountDeletion({
      storage,
      currentUserId: null,
      signOut: async () => {
        signedOut.push('again');
      },
      deleteSpace: async (userId) => {
        deleted.push(userId);
      },
    });
    expect(deleted).toEqual([USER]);
    expect(signedOut).toEqual([USER]);
    expect(await readPendingAccountDeletion(storage)).toBeNull();

    await resumePendingAccountDeletion({
      storage,
      currentUserId: null,
      signOut: async () => {
        signedOut.push('again');
      },
      deleteSpace: async (userId) => {
        deleted.push(userId);
      },
    });
    expect(deleted).toEqual([USER]);
  });
});
