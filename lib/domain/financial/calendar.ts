import type { Transaction } from '@/lib/domain/transaction.types';

import { resolveTransactionKind } from './transaction-kind';
import { buildSpendingCalendar, type SpendingDayCell } from './spending-calendar';
import { getMonthKey } from './dates';

export type FinancialCalendarDayKind =
  | 'income'
  | 'expense'
  | 'transfer'
  | 'subscription'
  | 'credit_payment'
  | 'card_purchase'
  | 'card_payment'
  | 'goal'
  | 'investment';

export type FinancialCalendarDay = SpendingDayCell & {
  income: number;
  transfers: number;
  cardPurchases: number;
  cardPayments: number;
  kinds: FinancialCalendarDayKind[];
};

function classifyDayKinds(transactions: Transaction[]): FinancialCalendarDayKind[] {
  const kinds = new Set<FinancialCalendarDayKind>();
  for (const tx of transactions) {
    const kind = resolveTransactionKind(tx);
    switch (kind) {
      case 'income':
        kinds.add('income');
        break;
      case 'expense':
        kinds.add('expense');
        break;
      case 'transfer':
        kinds.add('transfer');
        break;
      case 'credit_card_purchase':
        kinds.add('card_purchase');
        break;
      case 'credit_card_payment':
        kinds.add('card_payment');
        break;
      default:
        break;
    }
  }
  return [...kinds];
}

/** Timeline financeira mensal — calendário unificado para Análises, Home e previsão. */
export function buildFinancialCalendar(
  transactions: Transaction[],
  asOf: Date = new Date(),
): FinancialCalendarDay[] {
  const monthKey = getMonthKey(asOf);
  const spendingCells = buildSpendingCalendar(transactions, monthKey, asOf);
  const byDay = new Map<string, Transaction[]>();

  for (const tx of transactions) {
    if (!tx.date.startsWith(monthKey)) continue;
    const key = tx.date.slice(0, 10);
    const bucket = byDay.get(key) ?? [];
    bucket.push(tx);
    byDay.set(key, bucket);
  }

  return spendingCells.map((cell) => {
    const dayTxs = byDay.get(cell.dayKey) ?? [];
    let income = 0;
    let transfers = 0;
    let cardPurchases = 0;
    let cardPayments = 0;

    for (const tx of dayTxs) {
      const kind = resolveTransactionKind(tx);
      switch (kind) {
        case 'income':
          income += tx.amount;
          break;
        case 'transfer':
          transfers += tx.amount;
          break;
        case 'credit_card_purchase':
          cardPurchases += tx.amount;
          break;
        case 'credit_card_payment':
          cardPayments += tx.amount;
          break;
        default:
          break;
      }
    }

    return {
      ...cell,
      income,
      transfers,
      cardPurchases,
      cardPayments,
      kinds: classifyDayKinds(dayTxs),
    };
  });
}
