import { getCategoryLabel } from '@/lib/data/transaction-categories';
import { resolveTransactionKind } from '@/lib/domain/financial/transaction-kind';
import type { Transaction } from '@/lib/domain/transaction.types';
import { formatDateShort } from '@/lib/utils/format';

export function resolveMovementSourceName(
  transaction: Transaction,
  accountById: Record<string, string>,
  creditById: Record<string, string>,
): string | undefined {
  if (transaction.creditId) {
    const cardName = creditById[transaction.creditId];
    if (cardName) return cardName;
  }
  if (transaction.accountId) {
    const accountName = accountById[transaction.accountId];
    if (accountName) return accountName;
  }
  return undefined;
}

/** Label de categoria para UI — compras no cartão usam catálogo de despesas. */
export function getDisplayCategoryLabel(transaction: Transaction): string {
  const kind = resolveTransactionKind(transaction);
  if (kind === 'credit_card_purchase' || kind === 'credit_card_refund') {
    return getCategoryLabel(transaction.category, 'expense');
  }
  return transaction.categoryLabel || getCategoryLabel(transaction.category, transaction.type);
}

export function buildMovementSubtitle(
  transaction: Transaction,
  options: {
    accountById?: Record<string, string>;
    creditById?: Record<string, string>;
    includeDate?: boolean;
    includeReceipt?: boolean;
  } = {},
): string {
  const accountById = options.accountById ?? {};
  const creditById = options.creditById ?? {};
  const kind = resolveTransactionKind(transaction);
  const parts: string[] = [];

  if (kind === 'transfer') {
    parts.push('Transferência');
  } else if (kind === 'credit_card_payment') {
    parts.push('Pagamento cartão');
  } else if (kind === 'credit_card_refund') {
    parts.push('Reembolso cartão');
  } else {
    parts.push(getDisplayCategoryLabel(transaction));
  }

  if (options.includeDate !== false) {
    parts.push(formatDateShort(transaction.date));
  }

  const sourceName = resolveMovementSourceName(transaction, accountById, creditById);
  if (sourceName) {
    parts.push(sourceName);
  }

  if (options.includeReceipt && hasReceipt(transaction)) {
    parts.push('Talão');
  }

  return parts.join(' · ');
}

function hasReceipt(transaction: Transaction): boolean {
  return Boolean(transaction.receiptId || transaction.receiptImage || transaction.receiptUrl);
}

export function getMovementBadgeLabel(
  transaction: Transaction,
  accountById: Record<string, string>,
  creditById: Record<string, string>,
): string | null {
  const kind = resolveTransactionKind(transaction);
  if (kind === 'transfer') return 'Transferência';
  if (kind === 'credit_card_payment') return 'Pagamento cartão';
  if (transaction.recurringId) return 'Recorrente';

  const sourceName = resolveMovementSourceName(transaction, accountById, creditById);
  if (kind === 'credit_card_purchase' && sourceName) {
    return sourceName;
  }

  return null;
}
