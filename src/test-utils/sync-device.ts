import { DEFAULT_CATEGORIES } from '@/core/finance';
import { createLocalStore, createSyncEngine, type LocalStore, type SyncEngine } from '@/data/sync';

import { openTestDatabase, testId } from './node-sqlite-driver';
import type { ServerSession } from './supabase-server';
import { createTestTransport, type TestTransport } from './sync-transport';

export type TestDevice = LocalStore & {
  engine: SyncEngine;
  transport: TestTransport;
  close(): Promise<void>;
};

/** Um dispositivo com o espaço local de um utilizador, ligado ao servidor simulado. */
export async function createTestDevice(
  session: ServerSession,
  { seed = false, pageSize }: { seed?: boolean; pageSize?: number } = {},
): Promise<TestDevice> {
  const db = await openTestDatabase();
  const local = createLocalStore(db, { newId: testId });
  await local.sync.enableTracking(session.userId);
  if (seed) {
    await local.repositories.categories.seedDefaults(
      DEFAULT_CATEGORIES.map((category) => ({ ...category, name: category.key })),
    );
  }
  const transport = createTestTransport(session);
  const engine = createSyncEngine({ store: local.sync, transport, pageSize });
  return { ...local, engine, transport, close: () => db.close() };
}
