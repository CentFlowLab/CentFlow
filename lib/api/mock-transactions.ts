import { getCategoryLabel } from '@/lib/data/transaction-categories';
import type {
  CreateTransactionInput,
  Transaction,
  TransactionFilter,
} from '@/lib/domain/transaction.types';
import { toIsoDateString } from '@/lib/utils/format';

/** Store em memória — só activo com isMockAuthEnabled() em desenvolvimento. */
let store: Transaction[] = buildSeedTransactions();
let idCounter = store.length + 1;

function buildSeedTransactions(): Transaction[] {
  const today = toIsoDateString();
  const yesterday = toIsoDateString(new Date(Date.now() - 86400000));

  return [
    {
      id: 'mock-tx-1',
      type: 'expense',
      amount: 42.5,
      category: 'food',
      categoryLabel: getCategoryLabel('food', 'expense'),
      description: 'Almoço',
      date: today,
      currency: 'EUR',
      receiptId: null,
      receiptUrl: null,
      receiptImage: null,
    },
    {
      id: 'mock-tx-2',
      type: 'expense',
      amount: 18.9,
      category: 'transport',
      categoryLabel: getCategoryLabel('transport', 'expense'),
      description: 'Uber',
      date: yesterday,
      currency: 'EUR',
      receiptId: null,
      receiptUrl: null,
      receiptImage: null,
    },
    {
      id: 'mock-tx-3',
      type: 'income',
      amount: 1850,
      category: 'salary',
      categoryLabel: getCategoryLabel('salary', 'income'),
      description: 'Salário',
      date: yesterday,
      currency: 'EUR',
      receiptId: null,
      receiptUrl: null,
      receiptImage: null,
    },
  ];
}

function filterTransactions(
  transactions: Transaction[],
  filter: TransactionFilter,
): Transaction[] {
  if (filter === 'all') return transactions;
  return transactions.filter((t) => t.type === filter);
}

export async function fetchMockTransactions(
  filter: TransactionFilter = 'all',
): Promise<Transaction[]> {
  await new Promise((r) => setTimeout(r, 200));
  return filterTransactions(
    [...store].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    filter,
  );
}

export async function createMockTransaction(
  input: CreateTransactionInput,
  receipt?: {
    receiptId?: string;
    receiptUrl?: string;
    receiptImage?: string;
  },
): Promise<Transaction> {
  await new Promise((r) => setTimeout(r, 300));

  const transaction: Transaction = {
    id: `mock-tx-${idCounter++}`,
    type: input.type,
    amount: input.amount,
    category: input.category,
    categoryLabel: getCategoryLabel(input.category, input.type),
    description: input.description,
    date: input.date,
    currency: 'EUR',
    receiptId: receipt?.receiptId ?? null,
    receiptUrl: receipt?.receiptUrl ?? null,
    receiptImage: receipt?.receiptImage ?? input.receipt?.localUri ?? null,
  };

  store = [transaction, ...store];
  return transaction;
}

/** Útil para testes — repõe dados iniciais. */
export function resetMockTransactions(): void {
  store = buildSeedTransactions();
  idCounter = store.length + 1;
}
