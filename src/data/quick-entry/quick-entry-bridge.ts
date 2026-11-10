import { Directory, File, Paths } from 'expo-file-system';
import { AppState, Platform } from 'react-native';

import type { Repositories } from '../repositories/types';
import { buildQuickEntrySnapshot, importQueuedExpense, parseQueuedExpense } from './quick-entry';

/** Nomes partilhados com `plugins/quick-expense/MivenQuickExpense.swift`. */
export const SNAPSHOT_FILE = 'miven-quick-entry.json';
export const QUEUE_DIRECTORY = 'miven-quick-entries';

/** Só no iPhone: o Toque posterior e as App Intents são do iOS. */
export function quickEntrySupported(): boolean {
  return Platform.OS === 'ios';
}

async function writeSnapshot(repositories: Repositories): Promise<void> {
  const snapshot = await buildQuickEntrySnapshot(repositories);
  const file = new File(Paths.document, SNAPSHOT_FILE);
  if (!file.exists) file.create();
  await file.write(JSON.stringify(snapshot));
}

function removeSnapshot(): void {
  try {
    const file = new File(Paths.document, SNAPSHOT_FILE);
    if (file.exists) file.delete();
  } catch {
    console.error('[quick-entry] snapshot_remove_failed');
  }
}

/** Importa cada despesa da fila e só apaga o ficheiro depois de gravada (ou se for inválida). */
async function drainQueue(repositories: Repositories): Promise<number> {
  const directory = new Directory(Paths.document, QUEUE_DIRECTORY);
  if (!directory.exists) return 0;
  let imported = 0;
  const files = directory
    .list()
    .filter((entry): entry is File => entry instanceof File && entry.name.endsWith('.json'))
    .sort((a, b) => a.name.localeCompare(b.name));
  for (const file of files) {
    const item = parseQueuedExpense(await file.text());
    const outcome = item ? await importQueuedExpense(repositories, item) : 'invalid';
    if (outcome === 'invalid') console.error('[quick-entry] queued_item_invalid');
    else imported += 1;
    file.delete();
  }
  return imported;
}

/**
 * Liga a app ao registo rápido enquanto a base de dados de uma conta está aberta: mantém o resumo
 * atualizado e importa a fila ao abrir e sempre que a app volta a ficar ativa.
 * Devolve a função que desliga (e apaga o resumo, para a ação pedir para entrar na app).
 */
export function startQuickEntryBridge(repositories: Repositories): () => void {
  if (!quickEntrySupported()) return () => undefined;
  let stopped = false;
  let running: Promise<void> = Promise.resolve();

  const refresh = (drain: boolean) => {
    running = running
      .then(async () => {
        if (stopped) return;
        if (drain) await drainQueue(repositories);
        if (!stopped) await writeSnapshot(repositories);
      })
      .catch(() => {
        console.error('[quick-entry] refresh_failed');
      });
  };

  refresh(true);
  const unsubscribe = repositories.subscribe((entities) => {
    if (
      entities.some(
        (entity) => entity === 'categories' || entity === 'accounts' || entity === 'entries',
      )
    ) {
      refresh(false);
    }
  });
  const appState = AppState.addEventListener('change', (state) => {
    if (state === 'active') refresh(true);
  });
  return () => {
    stopped = true;
    unsubscribe();
    appState.remove();
    removeSnapshot();
  };
}
