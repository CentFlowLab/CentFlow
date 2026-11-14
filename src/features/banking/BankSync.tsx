import { useEffect } from 'react';
import { AppState } from 'react-native';

import { canRefreshBank } from '@/core/banking/open-banking';
import { useRepositories } from '@/data';

import { useAuth } from '../account/AuthProvider';
import { useToday } from '../finance/useToday';
import { loadBankConnections, refreshBankConnection } from './open-banking-client';

/** Verifica a cada 15 minutos com a app aberta; cada ligação respeita o intervalo mínimo. */
const CHECK_MS = 15 * 60_000;

/**
 * Com a app aberta, as contas associadas a um banco recebem os movimentos novos sem abrir o ecrã
 * dos bancos (ADR-069). Só ligações ativas com pelo menos uma conta associada; os bancos limitam
 * as leituras sem a pessoa presente, por isso nunca mais do que uma a cada 15 minutos.
 */
export function BankSync() {
  const { client, state } = useAuth();
  const repositories = useRepositories();
  const today = useToday();

  useEffect(() => {
    if (!client || state.status !== 'signedIn') return;
    let alive = true;
    let running = false;
    const tick = async () => {
      if (!alive || running || AppState.currentState !== 'active') return;
      running = true;
      try {
        const connections = await loadBankConnections(client);
        for (const connection of connections ?? []) {
          if (!alive) return;
          if (connection.status !== 'connected') continue;
          if (!connection.accounts.some((account) => account.app_account_id)) continue;
          if (!canRefreshBank(connection.last_sync_at, Date.now(), connection.last_error)) continue;
          await refreshBankConnection(
            client,
            repositories,
            connection,
            today,
            connection.aspsp_name,
          );
        }
      } finally {
        running = false;
      }
    };
    const run = () => void tick().catch(() => undefined);
    run();
    const timer = setInterval(run, CHECK_MS);
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') run();
    });
    return () => {
      alive = false;
      clearInterval(timer);
      subscription.remove();
    };
  }, [client, state.status, repositories, today]);

  return null;
}
