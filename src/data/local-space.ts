import { DatabaseUnavailableError } from './db/errors';
import type { LocalSpace } from './spaces';
import type { LocalStore } from './sync';

/**
 * Liga uma base de dados ao seu espaço. Num espaço de conta, todas as escritas passam a ser
 * registadas para sincronizar; uma base de dados de outra conta é recusada.
 */
export async function attachSpace(store: LocalStore, space: LocalSpace): Promise<void> {
  const { ownerUserId } = await store.sync.state();
  if (space.kind === 'anonymous') {
    if (ownerUserId !== null) throw new DatabaseUnavailableError('wrongOwner');
    return;
  }
  if (ownerUserId !== null && ownerUserId !== space.userId) {
    throw new DatabaseUnavailableError('wrongOwner');
  }
  await store.sync.enableTracking(space.userId);
}
