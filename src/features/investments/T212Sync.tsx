import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState } from 'react-native';

import { T212_POLL_MS } from '@/core/investments/trading212';
import { useRepositories } from '@/data';

import { useAuth } from '../account/AuthProvider';
import { useToday } from '../finance/useToday';
import { t212Enabled } from './Trading212Screen';
import { loadT212, refreshT212, syncT212Wealth } from './trading212-sync';

/**
 * Com a app aberta (em primeiro plano), a conta da Trading 212 atualiza-se a cada minuto e o item
 * do património acompanha, sem abrir o ecrã da integração. O servidor recusa pedidos a menos de
 * 10 s, por isso vários aparelhos não ultrapassam os limites da API.
 */
export function T212Sync() {
  const { t } = useTranslation();
  const { client, state } = useAuth();
  const repositories = useRepositories();
  const today = useToday();

  useEffect(() => {
    if (!t212Enabled() || !client || state.status !== 'signedIn') return;
    let alive = true;
    const tick = async () => {
      if (!alive || AppState.currentState !== 'active') return;
      const before = await loadT212(client);
      if (!before.integration) return;
      await refreshT212(client);
      const after = await loadT212(client);
      if (alive) await syncT212Wealth(repositories, after.snapshot, today, t('t212.title'));
    };
    const run = () => void tick().catch(() => undefined);
    run();
    const timer = setInterval(run, T212_POLL_MS);
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') run();
    });
    return () => {
      alive = false;
      clearInterval(timer);
      subscription.remove();
    };
  }, [client, state.status, repositories, today, t]);

  return null;
}
