import { useCallback, useEffect, useState } from 'react';

import { useDataQuery, type Repositories } from '@/data';

import { useAuth } from '../account/AuthProvider';
import { useSync } from '../account/SyncProvider';
import {
  cachedOnboardingDone,
  completeOnboarding,
  decideOnboarding,
  fetchServerOnboarding,
  hasSeenOnboarding,
  hasPendingCompletion,
  markOnboardingConfirmed,
  skippedOnboardingThisSession,
  type OnboardingDecision,
} from './onboarding-state';

/**
 * Decide se esta conta precisa do onboarding. Espera pela sessão, pelo perfil e pela primeira
 * sincronização deste aparelho antes de dizer `needed`; entretanto devolve `unknown`.
 * Também conclui no servidor o que ficou pendente e reconhece contas antigas que já têm dados.
 */
export function useOnboarding(): {
  decision: OnboardingDecision;
  syncedOnce: boolean;
  /** Conta a que a decisão se refere (`local` sem servidor). */
  key: string;
} {
  const { client, state } = useAuth();
  const { snapshot } = useSync();
  const userId = state.status === 'signedIn' ? state.user.id : null;
  const syncedOnce = Boolean(snapshot?.lastSyncedAt);
  const key = userId ?? 'local';
  const accounts = useDataQuery(
    // Contas ou património: uma conta antiga com qualquer um deles já está configurada.
    useCallback(
      async (repos: Repositories) =>
        (await repos.accounts.list()).length + (await repos.wealth.list()).length,
      [],
    ),
  );
  const hasData = (accounts.data ?? 0) > 0;
  const [remote, setRemote] = useState<{
    userId: string;
    cachedDone: boolean;
    serverDone: boolean | null;
  } | null>(null);

  const [deviceSeen, setDeviceSeen] = useState<boolean | null>(null);
  const local = state.status === 'unavailable';
  useEffect(() => {
    if (!local) return;
    let alive = true;
    void hasSeenOnboarding().then((seen) => {
      if (alive) setDeviceSeen(seen);
    });
    return () => {
      alive = false;
    };
  }, [local]);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    void (async () => {
      const cachedDone = await cachedOnboardingDone(userId);
      const pending = await hasPendingCompletion(userId);
      // Já confirmado pelo servidor nesta conta: não volta a perguntar.
      if (cachedDone && !pending) {
        if (alive) setRemote({ userId, cachedDone, serverDone: true });
        return;
      }
      const serverDone = client ? await fetchServerOnboarding(client) : null;
      if (alive) setRemote({ userId, cachedDone, serverDone });
      if (serverDone === true) await markOnboardingConfirmed(userId);
      // Conclusão feita sem rede: envia agora. Conta antiga com dados: grava a conclusão.
      if (serverDone === false && (cachedDone || hasData || pending)) {
        await completeOnboarding(client, userId);
      }
    })();
    return () => {
      alive = false;
    };
    // Volta a perguntar depois de cada sincronização (ex.: a primeira, num aparelho novo).
  }, [client, userId, hasData, snapshot?.lastSyncedAt]);

  if (local) {
    if (deviceSeen === null || accounts.data === undefined)
      return { decision: 'unknown', syncedOnce, key };
    return { decision: deviceSeen || hasData ? 'done' : 'needed', syncedOnce, key };
  }
  if (!userId || !remote || remote.userId !== userId || accounts.data === undefined) {
    return { decision: 'unknown', syncedOnce, key };
  }
  if (skippedOnboardingThisSession(userId)) return { decision: 'done', syncedOnce, key };
  return {
    decision: decideOnboarding({
      cachedDone: remote.cachedDone,
      serverDone: remote.serverDone,
      hasData,
      syncedOnce,
    }),
    syncedOnce,
    key,
  };
}
