import type { Transaction } from '@/lib/domain/transaction.types';

import { resolveTransactionKind } from './transaction-kind';

/** Eventos internos propagados quando um movimento altera o estado financeiro. */
export type FinancialEventType =
  | 'ACCOUNT_BALANCE_UPDATED'
  | 'BUDGET_UPDATED'
  | 'CASHFLOW_UPDATED'
  | 'CREDIT_DEBT_UPDATED'
  | 'GOAL_PROGRESS_UPDATED'
  | 'NET_WORTH_UPDATED'
  | 'CALENDAR_UPDATED'
  | 'HEALTH_UPDATED'
  | 'FORECAST_UPDATED'
  | 'SUGGESTIONS_UPDATED';

export type FinancialEvent = {
  type: FinancialEventType;
  transactionId?: string;
  amount?: number;
  accountId?: string;
  creditId?: string;
  goalId?: string;
};

const KIND_EVENTS: Record<ReturnType<typeof resolveTransactionKind>, FinancialEventType[]> = {
  income: [
    'ACCOUNT_BALANCE_UPDATED',
    'BUDGET_UPDATED',
    'CASHFLOW_UPDATED',
    'NET_WORTH_UPDATED',
    'HEALTH_UPDATED',
    'FORECAST_UPDATED',
    'SUGGESTIONS_UPDATED',
    'CALENDAR_UPDATED',
  ],
  expense: [
    'ACCOUNT_BALANCE_UPDATED',
    'BUDGET_UPDATED',
    'CASHFLOW_UPDATED',
    'NET_WORTH_UPDATED',
    'HEALTH_UPDATED',
    'CALENDAR_UPDATED',
  ],
  transfer: [
    'ACCOUNT_BALANCE_UPDATED',
    'BUDGET_UPDATED',
    'NET_WORTH_UPDATED',
    'CALENDAR_UPDATED',
  ],
  credit_card_purchase: [
    'CREDIT_DEBT_UPDATED',
    'CASHFLOW_UPDATED',
    'NET_WORTH_UPDATED',
    'CALENDAR_UPDATED',
    'HEALTH_UPDATED',
  ],
  credit_card_payment: [
    'ACCOUNT_BALANCE_UPDATED',
    'CREDIT_DEBT_UPDATED',
    'BUDGET_UPDATED',
    'NET_WORTH_UPDATED',
    'HEALTH_UPDATED',
    'FORECAST_UPDATED',
    'CALENDAR_UPDATED',
  ],
  credit_card_refund: [
    'CREDIT_DEBT_UPDATED',
    'CASHFLOW_UPDATED',
    'NET_WORTH_UPDATED',
    'CALENDAR_UPDATED',
  ],
  balance_adjustment: ['ACCOUNT_BALANCE_UPDATED', 'NET_WORTH_UPDATED'],
};

/** Deriva eventos internos a partir de um movimento (motor de eventos). */
export function deriveEventsFromTransaction(tx: Transaction): FinancialEvent[] {
  const kind = resolveTransactionKind(tx);
  const types = KIND_EVENTS[kind] ?? ['NET_WORTH_UPDATED'];

  return types.map((type) => ({
    type,
    transactionId: tx.id,
    amount: tx.amount,
    accountId: tx.accountId ?? undefined,
    creditId: tx.creditId ?? undefined,
  }));
}

export type FinancialEventSummary = {
  byType: Partial<Record<FinancialEventType, number>>;
  total: number;
};

/** Agrega eventos de uma lista de movimentos (útil para Doctor). */
export function summarizeFinancialEvents(transactions: Transaction[]): FinancialEventSummary {
  const byType: Partial<Record<FinancialEventType, number>> = {};
  let total = 0;

  for (const tx of transactions) {
    for (const event of deriveEventsFromTransaction(tx)) {
      byType[event.type] = (byType[event.type] ?? 0) + 1;
      total += 1;
    }
  }

  return { byType, total };
}
