import { isValidCalendarDate, type CalendarDate, type Id } from '@/core/finance';
import { currencyExponent, parseAmountInput } from '@/core/money';

import type { AccountWithBalance, Repositories } from '../repositories/types';

/**
 * Registo rápido fora da app (iPhone: Toque posterior → Atalho → "Registar despesa").
 *
 * A ação nativa (`plugins/quick-expense`) não abre a base de dados: duas cópias do SQLite no mesmo
 * processo podem corrompê-la. Em vez disso:
 * - a app escreve um resumo (`QuickEntrySnapshot`) com as categorias e a conta a usar;
 * - a ação grava cada despesa num ficheiro da fila (`QueuedExpense`);
 * - a app importa a fila com as validações normais (e a sincronização) ao abrir e ao voltar.
 */

export const QUICK_ENTRY_VERSION = 1;

export type QuickEntrySnapshot = {
  version: typeof QUICK_ENTRY_VERSION;
  /** Conta onde entram as despesas; `null` se ainda não há contas. */
  account: { id: Id; name: string; currency: string; fractionDigits: number } | null;
  /** Categorias de despesa, as mais usadas primeiro. */
  categories: { id: Id; name: string }[];
};

export type QueuedExpense = {
  version: typeof QUICK_ENTRY_VERSION;
  /** Valor com ponto decimal e no máximo as casas da moeda (ex.: "12.35"). */
  amount: string;
  description: string;
  categoryId: Id;
  accountId: Id;
  date: CalendarDate;
};

const ACCOUNT_ORDER = ['bank', 'card', 'cash'] as const;

/** A conta da despesa mais recente; sem despesas, a primeira de banco, cartão ou dinheiro. */
export async function pickQuickEntryAccount(
  repositories: Repositories,
): Promise<AccountWithBalance | null> {
  const accounts = await repositories.accounts.listWithBalances();
  if (accounts.length === 0) return null;
  const latest = await repositories.entries.list({ type: 'expense', limit: 1 });
  const used = latest.items[0]?.accountId;
  const recent = accounts.find((account) => account.id === used);
  if (recent) return recent;
  for (const type of ACCOUNT_ORDER) {
    const match = accounts.find((account) => account.type === type);
    if (match) return match;
  }
  return accounts[0] ?? null;
}

export async function buildQuickEntrySnapshot(
  repositories: Repositories,
): Promise<QuickEntrySnapshot> {
  const account = await pickQuickEntryAccount(repositories);
  const categories = await repositories.categories.listWithUsage('expense');
  const ordered = [...categories].sort(
    (a, b) => b.entryCount - a.entryCount || a.name.localeCompare(b.name),
  );
  return {
    version: QUICK_ENTRY_VERSION,
    account: account
      ? {
          id: account.id,
          name: account.name,
          currency: account.currency,
          fractionDigits: currencyExponent(account.currency),
        }
      : null,
    categories: ordered.map((category) => ({ id: category.id, name: category.name })),
  };
}

/** Lê um ficheiro da fila; `null` se não for uma despesa válida desta versão. */
export function parseQueuedExpense(text: string): QueuedExpense | null {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  if (item.version !== QUICK_ENTRY_VERSION) return null;
  if (typeof item.amount !== 'string' || !/^\d{1,12}(\.\d{1,4})?$/.test(item.amount)) return null;
  if (typeof item.description !== 'string') return null;
  if (typeof item.categoryId !== 'string' || typeof item.accountId !== 'string') return null;
  if (typeof item.date !== 'string' || !isValidCalendarDate(item.date)) return null;
  return {
    version: QUICK_ENTRY_VERSION,
    amount: item.amount,
    description: item.description.trim().slice(0, 140),
    categoryId: item.categoryId,
    accountId: item.accountId,
    date: item.date,
  };
}

export type ImportOutcome = 'imported' | 'invalid';

/**
 * Grava uma despesa da fila. A conta e a categoria podem ter sido apagadas entretanto: usa-se a
 * conta atual do registo rápido e a categoria de despesa mais usada.
 */
export async function importQueuedExpense(
  repositories: Repositories,
  item: QueuedExpense,
): Promise<ImportOutcome> {
  const accounts = await repositories.accounts.listWithBalances();
  const account =
    accounts.find((candidate) => candidate.id === item.accountId) ??
    (await pickQuickEntryAccount(repositories));
  if (!account) return 'invalid';

  const categories = await repositories.categories.listWithUsage('expense');
  const category =
    categories.find((candidate) => candidate.id === item.categoryId) ??
    [...categories].sort((a, b) => b.entryCount - a.entryCount)[0];
  if (!category) return 'invalid';

  const parsed = parseAmountInput(item.amount, account.currency);
  if (!parsed.ok || parsed.amountMinor <= 0) return 'invalid';

  await repositories.entries.create({
    type: 'expense',
    amount: parsed.amountMinor,
    description: item.description,
    categoryId: category.id,
    accountId: account.id,
    destinationAccountId: null,
    date: item.date,
    notes: null,
  });
  return 'imported';
}
