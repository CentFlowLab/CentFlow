import {
  absorbSourceChanges,
  clearImportedFromSource,
  copyRecords,
  hasFreshUserData,
  hasUserData,
  readImportState,
  revertCopy,
  unsettledCount,
  writeImportState,
  type ImportRecord,
  type ImportState,
} from '../sqlite/import-store';
import type { SyncEngine } from './engine';
import type { LocalStore } from './index';
import type { SyncTransport } from './transport';

export type { ImportState } from '../sqlite/import-store';

/** Proposta de importação: só quando há dados sem conta e ainda não houve decisão. */
export async function shouldOfferImport(
  anonymous: LocalStore,
  account: LocalStore,
): Promise<boolean> {
  const state = await readImportState(account.db);
  if (state.state === 'declined' || state.state === 'copied') return false;
  if (state.state === 'confirmed') return hasFreshUserData(anonymous.db, account.db);
  return hasUserData(anonymous.db);
}

export const getImportState = (account: LocalStore): Promise<ImportState> =>
  readImportState(account.db);

export const declineImport = (account: LocalStore): Promise<void> =>
  writeImportState(account.db, { state: 'declined' });

export type ImportProgress =
  /** Enviado e confirmado no servidor; os dados sem conta foram limpos. */
  | { status: 'confirmed'; imported: number }
  /** Copiado, à espera de ligação, de conflitos resolvidos ou de confirmação. */
  | { status: 'pending'; imported: number; unsettled: number };

async function verifyOnServer(transport: SyncTransport, records: ImportRecord[]): Promise<boolean> {
  for (let index = 0; index < records.length; index += 500) {
    const chunk = records.slice(index, index + 500);
    const results = await transport.verify(chunk);
    const confirmed = new Set(
      results
        .filter((result) => result.version !== null && result.version > 0)
        .map((result) => `${result.entity}:${result.id}`),
    );
    if (chunk.some((record) => !confirmed.has(`${record.entity}:${record.id}`))) return false;
  }
  return true;
}

/**
 * Importa (ou retoma a importação) dos dados sem conta para a conta:
 * 1. copia numa única transação, registando tudo para envio (repetível sem duplicar);
 * 2. se a origem mudou desde a cópia, volta a copiar essa versão (sem apagar a anterior na conta
 *    quando a conta também divergiu);
 * 3. sincroniza e confirma no servidor, registo a registo;
 * 4. só então limpa, no espaço sem conta, as linhas cujo conteúdo ainda é o confirmado.
 */
export async function runImport({
  anonymous,
  account,
  engine,
  transport,
}: {
  anonymous: LocalStore;
  account: LocalStore;
  engine: SyncEngine;
  transport: SyncTransport;
}): Promise<ImportProgress> {
  let state = await readImportState(account.db);
  if (state.state === 'none' || state.state === 'declined') {
    const records = await copyRecords(anonymous.db, account.db);
    state = { state: 'copied', records };
  }
  if (state.state === 'confirmed' && !state.sourceCleared) {
    state = { state: 'copied', records: state.records };
  }
  if (state.state === 'copied') {
    const records = await absorbSourceChanges(anonymous.db, account.db, state.records);
    state = { state: 'copied', records };
    await engine.sync();
    const unsettled = await unsettledCount(account.db, records);
    if (unsettled > 0 || !(await verifyOnServer(transport, records))) {
      return { status: 'pending', imported: records.length, unsettled };
    }
    const cleared = await clearImportedFromSource(anonymous.db, records);
    if (cleared.pending > 0) {
      return { status: 'pending', imported: records.length, unsettled: cleared.pending };
    }
    await writeImportState(account.db, {
      state: 'confirmed',
      records,
      sourceCleared: true,
    });
    return { status: 'confirmed', imported: records.length };
  }
  if (!state.sourceCleared) {
    const cleared = await clearImportedFromSource(anonymous.db, state.records);
    if (cleared.pending > 0) {
      return { status: 'pending', imported: state.records.length, unsettled: cleared.pending };
    }
    await writeImportState(account.db, { ...state, sourceCleared: true });
  }
  return { status: 'confirmed', imported: state.records.length };
}

/** Cancela uma importação ainda não confirmada. */
export async function cancelImport(account: LocalStore): Promise<boolean> {
  const state = await readImportState(account.db);
  if (state.state !== 'copied') return false;
  await revertCopy(account.db, state.records);
  return true;
}
