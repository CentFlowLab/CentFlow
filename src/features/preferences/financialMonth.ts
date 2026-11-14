import { useCallback, useEffect } from 'react';

import { parseStartDaySetting } from '@/core/finance';
import { useDataQuery, useRepositories, type Repositories } from '@/data';
import { appStorage } from '@/lib/storage/key-value-store';

import { legacyFinancialMonthStartDay, PREFERENCES_STORAGE_KEY } from './preferences';

const KEY = 'financial_month_start_day';

/**
 * Início do mês financeiro da conta (ADR-077, ADR-079): uma definição sincronizada, a mesma em
 * todos os aparelhos. Sem rede, vale o que está neste aparelho e segue na fila normal.
 * Enquanto lê (uma consulta local), conta o mês civil.
 */
export function useFinancialMonthStartDay(): number {
  const query = useDataQuery(
    useCallback((repositories: Repositories) => repositories.settings.get(KEY), []),
  );
  return parseStartDaySetting(query.data);
}

export function useSetFinancialMonthStartDay(): (day: number) => Promise<void> {
  const repositories = useRepositories();
  return useCallback((day: number) => repositories.settings.set(KEY, String(day)), [repositories]);
}

/**
 * Uma vez por conta: a escolha feita na 0.1.22 (só neste aparelho) passa para a definição da
 * conta, se a conta ainda não tiver nenhuma. Uma escolha já sincronizada nunca é substituída.
 */
export async function migrateLegacyStartDay(repositories: Repositories): Promise<void> {
  const legacy = legacyFinancialMonthStartDay(
    await appStorage.getItem(PREFERENCES_STORAGE_KEY).catch(() => null),
  );
  if (legacy === null) return;
  if ((await repositories.settings.get(KEY)) !== null) return;
  await repositories.settings.set(KEY, String(legacy));
}

/** Corre a passagem acima quando a base de dados da conta abre (DataGate). */
export function LegacyStartDayMigration() {
  const repositories = useRepositories();
  useEffect(() => {
    void migrateLegacyStartDay(repositories).catch(() => undefined);
  }, [repositories]);
  return null;
}
