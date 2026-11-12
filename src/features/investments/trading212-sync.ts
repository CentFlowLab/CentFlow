import type { SupabaseClient } from '@supabase/supabase-js';

import type { T212Snapshot } from '@/core/investments/trading212';
import type { Repositories } from '@/data';
import { appStorage } from '@/lib/storage/key-value-store';

/** Item do património onde conta o valor da conta (id), `none` (não contar) ou ausente. */
export const T212_LINK_KEY = 't212.wealthItemId';

export type T212Integration = {
  status: 'connected' | 'error';
  environment: 'live' | 'demo';
  last_sync_at: string | null;
  last_error: string | null;
};
export type T212State = { integration: T212Integration | null; snapshot: T212Snapshot | null };

/** Estado e último retrato (RLS: só os da própria pessoa). */
export async function loadT212(client: SupabaseClient): Promise<T212State> {
  const [integration, snapshot] = await Promise.all([
    client
      .from('integrations')
      .select('status, environment, last_sync_at, last_error')
      .eq('provider', 'trading212')
      .maybeSingle(),
    client.from('investment_snapshots').select('data').eq('provider', 'trading212').maybeSingle(),
  ]);
  return {
    integration: (integration.data as T212Integration | null) ?? null,
    snapshot: ((snapshot.data as { data: T212Snapshot } | null)?.data ??
      null) as T212Snapshot | null,
  };
}

/** Pede dados novos ao servidor (que respeita o intervalo mínimo da Trading 212). */
export async function refreshT212(client: SupabaseClient): Promise<boolean> {
  const { error } = await client.functions.invoke('t212', {
    method: 'POST',
    body: { action: 'refresh' },
  });
  return !error;
}

export async function linkedItemId(): Promise<string | null> {
  return appStorage.getItem(T212_LINK_KEY).catch(() => null);
}

export async function setLinkedItem(value: string | null): Promise<void> {
  if (value === null) await appStorage.removeItem(T212_LINK_KEY).catch(() => undefined);
  else await appStorage.setItem(T212_LINK_KEY, value).catch(() => undefined);
}

/**
 * O valor da conta entra no património por um único item de investimento (nunca dois).
 * Sem escolha feita: se não houver nenhum investimento nessa moeda, cria "Trading 212" e liga-o;
 * se já houver, não adivinha (podia contar duas vezes) e devolve `needsChoice`.
 */
export async function syncT212Wealth(
  repositories: Repositories,
  snapshot: T212Snapshot | null,
  today: string,
  name: string,
): Promise<'synced' | 'notCounted' | 'needsChoice' | 'skipped'> {
  if (!snapshot) return 'skipped';
  let linked = await linkedItemId();
  if (linked === 'none') return 'notCounted';
  if (linked) {
    const item = await repositories.wealth.get(linked);
    if (!item || item.closedOn) linked = null;
  }
  if (!linked) {
    const candidates = (await repositories.wealth.list()).filter(
      (item) => item.type === 'investment' && !item.closedOn && item.currency === snapshot.currency,
    );
    if (candidates.length > 0) return 'needsChoice';
    const created = await repositories.wealth.create({
      name,
      type: 'investment',
      amount: snapshot.total,
      currency: snapshot.currency,
      valuedOn: today,
    });
    await setLinkedItem(created.id);
    return 'synced';
  }
  const item = await repositories.wealth.get(linked);
  if (!item || item.currency !== snapshot.currency) return 'skipped';
  if (item.amount !== snapshot.total || item.valuedOn !== today) {
    await repositories.wealth.update(item.id, {
      name: item.name,
      type: item.type,
      amount: snapshot.total,
      currency: item.currency,
      valuedOn: today,
    });
  }
  return 'synced';
}
