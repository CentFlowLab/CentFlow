import assert from 'node:assert/strict';
import test from 'node:test';

import { composeDashboardFromLocalSources } from '@/lib/domain/dashboard.compose';
import { buildNetWorthProjection } from '@/lib/domain/net-worth.service';
import {
  filterOccurredTransactions,
  filterFutureTransactions,
  isTransactionFuture,
  isTransactionOccurred,
  sumTransactionCashBalance,
} from '@/lib/domain/transaction-date.utils';
import type { Transaction } from '@/lib/domain/transaction.types';

const AS_OF = new Date('2026-06-19T10:00:00');

function tx(
  id: string,
  date: string,
  type: 'income' | 'expense',
  amount: number,
): Transaction {
  return {
    id,
    type,
    amount,
    category: type === 'income' ? 'salary' : 'food',
    categoryLabel: type === 'income' ? 'Salário' : 'Alimentação',
    date,
    currency: 'EUR',
  };
}

test('movimento futuro (20/06) não altera património actual em 19/06', () => {
  const result = composeDashboardFromLocalSources({
    transactions: [tx('1', '2026-06-20', 'income', 100)],
    assets: { goals: [], inventory: [], subscriptions: [], warranties: [], credits: [] },
    credits: [],
    asOf: AS_OF,
  });

  assert.equal(result.netWorth.netWorth, 0);
  assert.equal(result.projection.futureMovementsDelta, 100);
  assert.equal(result.projection.netWorth, 100);
});

test('movimento passado (18/06) altera património actual em 19/06', () => {
  const result = composeDashboardFromLocalSources({
    transactions: [tx('1', '2026-06-18', 'income', 100)],
    assets: { goals: [], inventory: [], subscriptions: [], warranties: [], credits: [] },
    credits: [],
    asOf: AS_OF,
  });

  assert.equal(result.netWorth.netWorth, 100);
  assert.equal(result.projection.futureMovementsDelta, 0);
  assert.equal(result.projection.netWorth, 100);
});

test('movimento de hoje (19/06) conta no património actual', () => {
  const result = composeDashboardFromLocalSources({
    transactions: [tx('1', '2026-06-19', 'income', 250)],
    assets: { goals: [], inventory: [], subscriptions: [], warranties: [], credits: [] },
    credits: [],
    asOf: AS_OF,
  });

  assert.equal(result.netWorth.netWorth, 250);
});

test('mistura de movimentos passados e futuros calcula actual e projetado', () => {
  const transactions = [
    tx('1', '2026-06-10', 'income', 1000),
    tx('2', '2026-06-15', 'expense', 200),
    tx('3', '2026-07-01', 'income', 1090),
    tx('4', '2026-07-05', 'expense', 90),
  ];

  const result = composeDashboardFromLocalSources({
    transactions,
    assets: { goals: [], inventory: [], subscriptions: [], warranties: [], credits: [] },
    credits: [],
    asOf: AS_OF,
  });

  assert.equal(result.netWorth.netWorth, 800);
  assert.equal(result.projection.futureMovementsDelta, 1000);
  assert.equal(result.projection.netWorth, 1800);
});

test('exemplo do utilizador: salário 01/07 não entra no PL actual em 19/06', () => {
  const result = composeDashboardFromLocalSources({
    transactions: [tx('salary', '2026-07-01', 'income', 1090)],
    assets: {
      goals: [],
      inventory: [{ id: 'inv', name: 'Ativo', value: 10000 }],
      subscriptions: [],
      warranties: [],
      credits: [],
    },
    credits: [],
    asOf: AS_OF,
  });

  assert.equal(result.netWorth.netWorth, 10000);
  assert.equal(result.projection.futureMovementsDelta, 1090);
  assert.equal(result.projection.netWorth, 11090);
});

test('objetivo não duplica dinheiro: receita 500 + goal.current 500 → PL 500', () => {
  const result = composeDashboardFromLocalSources({
    transactions: [tx('1', '2026-06-10', 'income', 500)],
    assets: {
      goals: [
        {
          id: 'goal-1',
          name: 'Fundo de emergência',
          current: 500,
          target: 1000,
        } as never,
      ],
      inventory: [],
      subscriptions: [],
      warranties: [],
      credits: [],
    },
    credits: [],
    asOf: AS_OF,
  });

  // O dinheiro do objetivo já está no saldo de movimentos — não deve somar de novo.
  assert.equal(result.netWorth.netWorth, 500);
  assert.equal(result.netWorth.breakdown.savings, 0);
});

test('isTransactionOccurred e isTransactionFuture são complementares', () => {
  assert.equal(isTransactionOccurred('2026-06-19', AS_OF), true);
  assert.equal(isTransactionFuture('2026-06-19', AS_OF), false);
  assert.equal(isTransactionOccurred('2026-06-20', AS_OF), false);
  assert.equal(isTransactionFuture('2026-06-20', AS_OF), true);
});

test('sumTransactionCashBalance separa âmbitos temporalmente', () => {
  const transactions = [
    tx('1', '2026-06-18', 'income', 100),
    tx('2', '2026-06-25', 'income', 50),
    tx('3', '2026-07-01', 'expense', 30),
  ];

  assert.equal(sumTransactionCashBalance(transactions, 'occurred', AS_OF), 100);
  assert.equal(sumTransactionCashBalance(transactions, 'future', AS_OF), 20);
  assert.equal(sumTransactionCashBalance(transactions, 'all', AS_OF), 120);
});

test('filterOccurredTransactions exclui movimentos futuros', () => {
  const transactions = [
    tx('1', '2026-06-18', 'income', 100),
    tx('2', '2026-06-25', 'income', 50),
  ];

  assert.equal(filterOccurredTransactions(transactions, AS_OF).length, 1);
  assert.equal(filterFutureTransactions(transactions, AS_OF).length, 1);
});

test('buildNetWorthProjection soma delta futuro ao património actual', () => {
  const projection = buildNetWorthProjection(10000, 1090);
  assert.equal(projection.netWorth, 11090);
  assert.equal(projection.futureMovementsDelta, 1090);
});
