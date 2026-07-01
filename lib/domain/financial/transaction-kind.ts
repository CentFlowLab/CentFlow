import type { Transaction } from '@/lib/domain/transaction.types';

/** Tipos canónicos do ledger (movimentos persistidos + goal_contribution externo). */
export type LedgerTransactionKind =
  | 'income'
  | 'expense'
  | 'transfer'
  | 'credit_card_purchase'
  | 'credit_card_payment'
  | 'credit_card_refund'
  | 'balance_adjustment';

export type TransactionLike = Pick<Transaction, 'type'> &
  Partial<Pick<Transaction, 'amount' | 'creditId' | 'accountId' | 'category'>>;

/** Normaliza tipos legados (expense+creditId, credit_payment) para o modelo canónico. */
export function resolveTransactionKind(tx: TransactionLike): LedgerTransactionKind {
  if (tx.type === 'credit_card_purchase') return 'credit_card_purchase';
  if (tx.type === 'credit_card_payment' || tx.type === 'credit_payment') {
    return 'credit_card_payment';
  }
  if (tx.type === 'credit_card_refund') return 'credit_card_refund';
  if (tx.type === 'balance_adjustment') return 'balance_adjustment';
  if (tx.type === 'transfer') return 'transfer';
  if (tx.type === 'expense' && tx.creditId) return 'credit_card_purchase';
  if (tx.type === 'income') return 'income';
  return 'expense';
}

export function isCreditCardPurchaseKind(kind: LedgerTransactionKind): boolean {
  return kind === 'credit_card_purchase';
}

export function isCreditCardPaymentKind(kind: LedgerTransactionKind): boolean {
  return kind === 'credit_card_payment';
}

export function isCreditCardRefundKind(kind: LedgerTransactionKind): boolean {
  return kind === 'credit_card_refund';
}

export function countsAsBudgetExpense(tx: TransactionLike): boolean {
  const kind = resolveTransactionKind(tx);
  return kind === 'expense' || kind === 'credit_card_purchase';
}

export function countsAsBudgetIncome(tx: TransactionLike): boolean {
  const kind = resolveTransactionKind(tx);
  return kind === 'income';
}

export function countsAsCalendarSpending(tx: TransactionLike): boolean {
  const kind = resolveTransactionKind(tx);
  return kind === 'expense' || kind === 'credit_card_purchase';
}

export function countsAsCalendarSpendingReduction(tx: TransactionLike): boolean {
  return resolveTransactionKind(tx) === 'credit_card_refund';
}

export function excludesFromCalendarSpending(tx: TransactionLike): boolean {
  const kind = resolveTransactionKind(tx);
  return (
    kind === 'transfer' ||
    kind === 'credit_card_payment' ||
    kind === 'balance_adjustment'
  );
}
