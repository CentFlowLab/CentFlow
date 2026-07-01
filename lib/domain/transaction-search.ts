import { getCategoryLabel } from '@/lib/data/transaction-categories';
import type { Subscription } from '@/lib/domain/assets.types';
import type { Transaction, TransactionFilter } from '@/lib/domain/transaction.types';

const RECURRING_CATEGORY_IDS = new Set([
  'streaming',
  'software',
  'magazines',
  'apps',
  'subscriptions',
]);

export type MovementSearchOptions = {
  query: string;
  typeFilter: TransactionFilter;
  /** Nomes de despesas recorrentes registadas — usados para filtro recorrente. */
  recurringNames?: string[];
};

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function matchesAmount(tx: Transaction, rawQuery: string): boolean {
  const normalized = rawQuery.replace(',', '.').replace(/[^\d.-]/g, '');
  if (!normalized) return false;
  const target = Number.parseFloat(normalized);
  if (!Number.isFinite(target)) return false;
  return Math.abs(tx.amount - Math.abs(target)) < 0.01;
}

function matchesRecurring(
  tx: Transaction,
  recurringNames: string[],
): boolean {
  if (RECURRING_CATEGORY_IDS.has(tx.category)) return true;

  const haystack = normalize([tx.description, tx.categoryLabel].filter(Boolean).join(' '));
  if (!haystack) return false;

  return recurringNames.some((name) => {
    const needle = normalize(name);
    return needle.length >= 2 && haystack.includes(needle);
  });
}

/** Filtra movimentos por texto, tipo e padrão recorrente. */
export function filterTransactionsBySearch(
  transactions: Transaction[],
  options: MovementSearchOptions,
): Transaction[] {
  const query = options.query.trim();
  let result = transactions;

  if (options.typeFilter !== 'all') {
    result = result.filter((tx) => tx.type === options.typeFilter);
  }

  if (!query) return result;

  const normalizedQuery = normalize(query);
  const recurringNames = options.recurringNames ?? [];

  return result.filter((tx) => {
    if (matchesAmount(tx, query)) return true;

    const label = getCategoryLabel(tx.category, tx.type);
    const fields = [
      tx.description,
      tx.categoryLabel,
      label,
      tx.category,
      tx.type === 'expense' ? 'despesa' : 'receita',
      String(tx.amount),
    ];

    if (/recorrent|subscri/i.test(normalizedQuery) && matchesRecurring(tx, recurringNames)) {
      return true;
    }

    return fields.some((field) => field && normalize(String(field)).includes(normalizedQuery));
  });
}

export function buildRecurringNameList(subscriptions: Subscription[]): string[] {
  return subscriptions.map((item) => item.name).filter(Boolean);
}
