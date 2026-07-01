import type { Credit } from '@/lib/domain/types';
import type { Transaction } from '@/lib/domain/transaction.types';

import { addMoney, roundMoney, subtractMoney } from './money';

export type CreditCardPurchaseInput = {
  credit: Pick<Credit, 'id' | 'outstandingBalance' | 'originalAmount'>;
  amount: number;
};

export type CreditCardPaymentInput = {
  credit: Pick<Credit, 'id' | 'outstandingBalance'>;
  amount: number;
  fromAccountBalance: number;
};

export function calculateCreditCardBalance(
  credit: Pick<Credit, 'outstandingBalance'>,
): number {
  return roundMoney(Math.max(0, credit.outstandingBalance));
}

export function calculateAvailableCredit(
  credit: Pick<Credit, 'outstandingBalance' | 'originalAmount'>,
): number | null {
  if (!credit.originalAmount || credit.originalAmount <= 0) return null;
  return roundMoney(Math.max(0, subtractMoney(credit.originalAmount, credit.outstandingBalance)));
}

export function calculateCreditUtilization(
  credit: Pick<Credit, 'outstandingBalance' | 'originalAmount'>,
): number | null {
  if (!credit.originalAmount || credit.originalAmount <= 0) return null;
  return Math.min(100, Math.max(0, (credit.outstandingBalance / credit.originalAmount) * 100));
}

/** Compra no cartão — aumenta dívida. */
export function recordCreditCardPurchase(input: CreditCardPurchaseInput): {
  newBalance: number;
} {
  const newBalance = roundMoney(addMoney(input.credit.outstandingBalance, input.amount));
  return { newBalance };
}

/** Pagamento do cartão — reduz dívida (conta debitada via movimento credit_payment). */
export function recordCreditCardPayment(input: CreditCardPaymentInput): {
  newCreditBalance: number;
  newAccountBalance: number;
} {
  const newCreditBalance = roundMoney(
    Math.max(0, subtractMoney(input.credit.outstandingBalance, input.amount)),
  );
  const newAccountBalance = roundMoney(
    subtractMoney(input.fromAccountBalance, input.amount),
  );
  return { newCreditBalance, newAccountBalance };
}

export function creditBalanceDeltaForTransaction(
  tx: Pick<Transaction, 'type' | 'amount' | 'creditId'>,
  direction: 'apply' | 'reverse',
): number {
  if (!tx.creditId) return 0;
  const sign = direction === 'apply' ? 1 : -1;
  if (tx.type === 'expense') return sign * tx.amount;
  if (tx.type === 'credit_payment') return sign * -tx.amount;
  return 0;
}

export function applyCreditBalanceDelta(
  credit: Credit,
  delta: number,
): Credit {
  return {
    ...credit,
    outstandingBalance: roundMoney(Math.max(0, addMoney(credit.outstandingBalance, delta))),
  };
}

export function isCreditCardExpense(
  tx: Pick<Transaction, 'type' | 'creditId'>,
): boolean {
  return tx.type === 'expense' && Boolean(tx.creditId);
}

export function isCreditCardPaymentTransaction(
  tx: Pick<Transaction, 'type'>,
): boolean {
  return tx.type === 'credit_payment';
}
