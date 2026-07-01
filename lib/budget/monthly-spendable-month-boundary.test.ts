import assert from 'node:assert/strict';
import test from 'node:test';

import { calculateMonthlySpendable } from '@/lib/budget/calculateMonthlySpendable';
import {
  isTransactionFuture,
  isTransactionOccurred,
  parseTransactionDate,
} from '@/lib/domain/transaction-date.utils';
import { summarizeCurrentMonth } from '@/lib/domain/transaction-grouping';
import type { Transaction } from '@/lib/domain/transaction.types';

const JULY_FIRST = new Date(2026, 6, 1);

function tx(
  partial: Pick<Transaction, 'type' | 'amount' | 'date'> & Partial<Transaction>,
): Transaction {
  return {
    id: partial.id ?? 'tx-1',
    description: partial.description ?? 'Test',
    category: partial.category ?? 'other',
    categoryLabel: partial.categoryLabel ?? 'Outros',
    type: partial.type,
    amount: partial.amount,
    date: partial.date,
    currency: 'EUR',
  };
}

function isSameMonth(date: Date, reference: Date): boolean {
  return date.getFullYear() === reference.getFullYear() && date.getMonth() === reference.getMonth();
}

function filterCurrentMonthOccurred(transactions: Transaction[], reference: Date): Transaction[] {
  return transactions.filter(
    (item) =>
      isTransactionOccurred(item.date, reference) &&
      isSameMonth(parseTransactionDate(item.date), reference),
  );
}

test('dia 1 — movimentos de Junho não entram no disponível de Julho', () => {
  const transactions = [
    tx({ id: 'june-exp', type: 'expense', amount: 800, date: '2026-06-30' }),
    tx({ id: 'july-inc', type: 'income', amount: 2000, date: '2026-07-01' }),
  ];

  const occurredThisMonth = filterCurrentMonthOccurred(transactions, JULY_FIRST);
  assert.equal(occurredThisMonth.length, 1);
  assert.equal(occurredThisMonth[0]!.amount, 2000);

  const result = calculateMonthlySpendable({
    currentBalance: 0,
    currentMonthMovements: occurredThisMonth.map((item) => ({
      type: item.type,
      amount: item.amount,
      date: item.date,
    })),
    referenceDate: JULY_FIRST,
  });

  assert.equal(result.remainingThisMonth, 2000);
});

test('dia 1 — resumo mensal da lista ignora mês anterior', () => {
  const transactions = [
    tx({ type: 'expense', amount: 500, date: '2026-06-28' }),
    tx({ type: 'income', amount: 100, date: '2026-07-01' }),
  ];

  const summary = summarizeCurrentMonth(transactions, JULY_FIRST);
  assert.equal(summary.count, 1);
  assert.equal(summary.net, 100);
});

test('movimentos futuros do mês actual não contam como ocorridos', () => {
  const reference = new Date(2026, 6, 15);
  assert.equal(isTransactionFuture('2026-07-25', reference), true);
  assert.equal(isTransactionOccurred('2026-07-10', reference), true);
  assert.equal(isTransactionOccurred('2026-06-30', reference), true);

  const occurred = filterCurrentMonthOccurred(
    [tx({ type: 'expense', amount: 50, date: '2026-07-25' })],
    reference,
  );
  assert.equal(occurred.length, 0);
});

test('último dia do mês — só inclui movimentos desse mês', () => {
  const lastDayJune = new Date(2026, 5, 30);
  const transactions = [
    tx({ type: 'expense', amount: 120, date: '2026-06-30' }),
    tx({ type: 'income', amount: 900, date: '2026-07-01' }),
  ];

  const summary = summarizeCurrentMonth(transactions, lastDayJune);
  assert.equal(summary.count, 1);
  assert.equal(summary.net, -120);
});
