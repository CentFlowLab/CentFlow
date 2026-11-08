import {
  clearImportedFromSource,
  copyRecords,
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
 * 2. sincroniza;
 * 3. confirma no servidor, registo a registo, que tudo foi persistido;
 * 4. só então limpa, no espaço sem conta, exatamente o que foi importado.
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
  if (state.state === 'copied') {
    await engine.sync();
    const unsettled = await unsettledCount(account.db, state.records);
    if (unsettled > 0 || !(await verifyOnServer(transport, state.records))) {
      return { status: 'pending', imported: state.records.length, unsettled };
    }
    state = { state: 'confirmed', records: state.records, sourceCleared: false };
    await writeImportState(account.db, state);
  }
  if (!state.sourceCleared) {
    await clearImportedFromSource(anonymous.db, state.records);
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
