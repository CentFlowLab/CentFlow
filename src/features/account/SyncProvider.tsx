import * as Network from 'expo-network';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { AppState } from 'react-native';

import {
  ANONYMOUS_SPACE,
  createSupabaseTransport,
  createSyncEngine,
  getImportState,
  openLocalSpace,
  runImport,
  shouldOfferImport,
  type ImportProgress,
  type LocalStore,
  type SyncEngine,
  type SyncSnapshot,
} from '@/data';

import { useActiveSpace } from '../app-shell/DataGate';
import { useAuth } from './AuthProvider';
import { ImportDialog } from './ImportDialog';

const DEBOUNCE_MS = 1500;
const PERIODIC_MS = 5 * 60_000;
const MAX_BACKOFF_MS = 5 * 60_000;

type SyncContextValue = {
  /** `null` no uso sem conta. */
  engine: SyncEngine | null;
  snapshot: SyncSnapshot | null;
  syncNow(): Promise<SyncSnapshot | null>;
  /** Importação dos dados sem conta (pedida pelo utilizador). */
  startImport(): Promise<ImportProgress | null>;
  /** Volta a perguntar se quer importar (ex.: a partir das definições). */
  offerImport(): void;
};

const SyncContext = createContext<SyncContextValue>({
  engine: null,
  snapshot: null,
  syncNow: async () => null,
  startImport: async () => null,
  offerImport: () => undefined,
});

export const useSync = () => useContext(SyncContext);

export function SyncProvider({ children }: PropsWithChildren) {
  const { space, store } = useActiveSpace();
  const { client } = useAuth();
  const userId = space.kind === 'user' ? space.userId : null;

  const sync = useMemo(() => {
    if (!userId || !client) return null;
    const transport = createSupabaseTransport(client);
    return { transport, engine: createSyncEngine({ store: store.sync, transport }) };
  }, [userId, client, store]);

  const [snapshot, setSnapshot] = useState<SyncSnapshot | null>(null);
  const [importOffered, setImportOffered] = useState(false);
  const failures = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncNowRef = useRef<() => Promise<SyncSnapshot | null>>(async () => null);

  const startImport = useCallback(async (): Promise<ImportProgress | null> => {
    if (!sync) return null;
    const anonymous = await openLocalSpace(ANONYMOUS_SPACE);
    return runImport({ anonymous, account: store, ...sync });
  }, [sync, store]);

  const syncNow = useCallback(async (): Promise<SyncSnapshot | null> => {
    if (!sync) return null;
    if (retryTimer.current) clearTimeout(retryTimer.current);
    const result = await sync.engine.sync();
    if (result.status === 'idle') {
      failures.current = 0;
      // Retoma uma importação já copiada (ex.: interrompida sem ligação).
      if ((await getImportState(store)).state === 'copied') await startImport().catch(() => null);
    } else if (result.status === 'offline' || result.status === 'error') {
      failures.current += 1;
      const delay = Math.min(MAX_BACKOFF_MS, 5000 * 2 ** (failures.current - 1));
      retryTimer.current = setTimeout(() => void syncNowRef.current(), delay);
    }
    return result;
  }, [sync, store, startImport]);

  useEffect(() => {
    syncNowRef.current = syncNow;
  }, [syncNow]);

  useEffect(() => {
    if (!sync) return;
    const unsubscribe = sync.engine.subscribe(setSnapshot);
    void sync.engine.snapshot().then(setSnapshot);
    void syncNow().then(async (result) => {
      if (result?.status !== 'idle') return;
      const anonymous = await openLocalSpace(ANONYMOUS_SPACE);
      if (await offerable(anonymous, store)) setImportOffered(true);
    });

    let debounce: ReturnType<typeof setTimeout> | null = null;
    const stopWrites = store.repositories.subscribe(() => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(async () => {
        if ((await store.sync.pendingCount()) > 0) void syncNow();
        else void sync.engine.snapshot().then(setSnapshot);
      }, DEBOUNCE_MS);
    });

    let wasConnected = true;
    const network = Network.addNetworkStateListener(({ isConnected, isInternetReachable }) => {
      const connected = isConnected !== false && isInternetReachable !== false;
      if (connected && !wasConnected) void syncNow();
      wasConnected = connected;
    });
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncNow();
    });
    const periodic = setInterval(() => {
      if (AppState.currentState === 'active') void syncNow();
    }, PERIODIC_MS);

    return () => {
      unsubscribe();
      stopWrites();
      network.remove();
      appState.remove();
      clearInterval(periodic);
      if (debounce) clearTimeout(debounce);
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, [sync, store, syncNow]);

  const value = useMemo<SyncContextValue>(
    () => ({
      engine: sync?.engine ?? null,
      snapshot: sync ? snapshot : null,
      syncNow,
      startImport,
      offerImport: () => setImportOffered(true),
    }),
    [sync, snapshot, syncNow, startImport],
  );

  return (
    <SyncContext.Provider value={value}>
      {children}
      {sync ? (
        <ImportDialog
          visible={importOffered}
          account={store}
          onStart={startImport}
          onClose={() => setImportOffered(false)}
        />
      ) : null}
    </SyncContext.Provider>
  );
}

async function offerable(anonymous: LocalStore, account: LocalStore): Promise<boolean> {
  try {
    return await shouldOfferImport(anonymous, account);
  } catch {
    return false;
  }
}
