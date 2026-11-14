import type { SupabaseClient } from '@supabase/supabase-js';

import type { WealthItem } from '@/core/finance';
import type { T212Snapshot } from '@/core/investments/trading212';
import type { Repositories } from '@/data';
import { appStorage } from '@/lib/storage/key-value-store';

/**
 * Associação antiga (até à 0.1.22), guardada só neste aparelho: id do item ou `none`. Só se lê
 * para converter a escolha feita na associação sincronizada (ADR-079) e depois apaga-se.
 */
export const T212_LINK_KEY = 't212.wealthItemId';
/** "Não contar no património": escolha deste aparelho (não muda dados). */
const T212_NOT_COUNTED_KEY = 't212.notCounted';

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

/**
 * Estado da associação ao património (ADR-079), lido dos dados sincronizados:
 * - `linked`: um só item ativo pertence à Trading 212;
 * - `ambiguous`: mais do que um (dois aparelhos escolheram sem rede); nada se atualiza até a
 *   pessoa escolher, e nada se apaga;
 * - `notCounted`: a pessoa escolheu não contar neste aparelho;
 * - `unlinked`: nenhum item pertence à integração.
 */
export type T212Link =
  | { status: 'linked'; item: WealthItem }
  | { status: 'ambiguous'; items: WealthItem[] }
  | { status: 'notCounted' }
  | { status: 'unlinked' };

function ownedItems(items: readonly WealthItem[]): WealthItem[] {
  return items.filter((item) => item.integration === 'trading212' && !item.closedOn);
}

async function notCountedHere(): Promise<boolean> {
  return (await appStorage.getItem(T212_NOT_COUNTED_KEY).catch(() => null)) === '1';
}

/**
 * Converte a associação antiga (só deste aparelho) na associação sincronizada, uma vez: só se o
 * item ainda existir, estiver ativo e nenhum outro já pertencer à integração. Nunca apaga nada.
 */
async function migrateLegacyLink(repositories: Repositories): Promise<void> {
  const legacy = await appStorage.getItem(T212_LINK_KEY).catch(() => null);
  if (legacy === null) return;
  if (legacy === 'none') {
    await appStorage.setItem(T212_NOT_COUNTED_KEY, '1').catch(() => undefined);
  } else {
    const items = await repositories.wealth.list();
    const item = items.find((candidate) => candidate.id === legacy);
    if (
      item &&
      !item.closedOn &&
      item.type === 'investment' &&
      item.integration === null &&
      ownedItems(items).length === 0
    ) {
      await repositories.wealth.setIntegration(item.id, 'trading212');
    }
  }
  await appStorage.removeItem(T212_LINK_KEY).catch(() => undefined);
}

export async function readT212Link(repositories: Repositories): Promise<T212Link> {
  await migrateLegacyLink(repositories);
  if (await notCountedHere()) return { status: 'notCounted' };
  const owned = ownedItems(await repositories.wealth.list());
  if (owned.length === 1) return { status: 'linked', item: owned[0]! };
  if (owned.length > 1) return { status: 'ambiguous', items: owned };
  return { status: 'unlinked' };
}

/**
 * Escolha explícita da pessoa: um item (passa a ser o único da integração; os outros deixam de
 * lhe pertencer, sem perderem nada), `none` (não contar neste aparelho) ou `null` (desligar).
 */
export async function chooseT212Item(
  repositories: Repositories,
  choice: string | 'none' | null,
): Promise<void> {
  await migrateLegacyLink(repositories);
  if (choice === 'none') {
    await appStorage.setItem(T212_NOT_COUNTED_KEY, '1').catch(() => undefined);
    return;
  }
  await appStorage.removeItem(T212_NOT_COUNTED_KEY).catch(() => undefined);
  const owned = ownedItems(await repositories.wealth.list());
  for (const item of owned) {
    if (item.id !== choice) await repositories.wealth.setIntegration(item.id, null);
  }
  if (choice !== null) {
    const item = await repositories.wealth.get(choice);
    if (item && !item.closedOn && item.integration !== 'trading212') {
      await repositories.wealth.setIntegration(item.id, 'trading212');
    }
  }
}

/**
 * O valor da conta entra no património por um único item que pertence à integração (ADR-079).
 * Nunca apaga nem altera itens da pessoa: sem item da integração e sem investimentos nessa moeda,
 * cria um; havendo investimentos, não adivinha (`needsChoice`); com dois itens da integração
 * (dois aparelhos), não escolhe (`ambiguous`).
 */
export async function syncT212Wealth(
  repositories: Repositories,
  snapshot: T212Snapshot | null,
  today: string,
  name: string,
): Promise<'synced' | 'notCounted' | 'needsChoice' | 'ambiguous' | 'skipped'> {
  if (!snapshot) return 'skipped';
  const link = await readT212Link(repositories);
  if (link.status === 'notCounted') return 'notCounted';
  if (link.status === 'ambiguous') return 'ambiguous';
  if (link.status === 'unlinked') {
    const investments = (await repositories.wealth.list()).filter(
      (item) => item.type === 'investment' && !item.closedOn && item.currency === snapshot.currency,
    );
    if (investments.length > 0) return 'needsChoice';
    await repositories.wealth.create({
      name,
      type: 'investment',
      amount: snapshot.total,
      currency: snapshot.currency,
      valuedOn: today,
      integration: 'trading212',
    });
    return 'synced';
  }
  const item = link.item;
  // Outra moeda: não se converte nem se mistura; fica como está até a pessoa decidir.
  if (item.currency !== snapshot.currency) return 'skipped';
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
