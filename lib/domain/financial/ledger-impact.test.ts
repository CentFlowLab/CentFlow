import assert from 'node:assert/strict';
import test from 'node:test';

import { calculateAccountBalance } from '@/lib/domain/financial/accounts';
import {
  calculateBudgetImpact,
  calculateCreditCardImpact,
  calculateNetSpending,
  calculateRefundImpact,
} from '@/lib/domain/financial/ledger-impact';
import { getExpenseTotal, getIncomeTotal } from '@/lib/domain/financial/transactions';
import { buildSpendingCalendar, calendarSpendingDelta } from '@/lib/domain/financial/spending-calendar';
import { toSpendableMovement } from '@/lib/domain/monthly-budget-movements';
import type { Transaction } from '@/lib/domain/transaction.types';

const JULY = { kind: 'month' as const, monthKey: '2026-07', asOf: new Date(2026, 6, 15) };

function tx(partial: Partial<Transaction> & Pick<Transaction, 'type' | 'amount' | 'date'>): Transaction {
  return {
    id: partial.id ?? 'tx-1',
    category: partial.category ?? 'food',
    categoryLabel: partial.categoryLabel ?? 'Comida',
    currency: 'EUR',
    ...partial,
  };
}

test('1. compra com cartão aumenta despesa e dívida', () => {
  const purchase = tx({
    type: 'credit_card_purchase',
    amount: 50,
    creditId: 'card-1',
    date: '2026-07-10',
  });
  assert.equal(getExpenseTotal([purchase], JULY), 50);
  assert.equal(calculateCreditCardImpact(purchase, 'card-1'), 50);
});

test('2. compra com cartão não reduz conta corrente', () => {
  const balance = calculateAccountBalance({
    account: { id: 'acc-1', initialBalance: 500 },
    transactions: [
      tx({
        type: 'credit_card_purchase',
        amount: 50,
        creditId: 'card-1',
        date: '2026-07-10',
      }),
    ],
  });
  assert.equal(balance, 500);
});

test('3. pagamento do cartão reduz conta e dívida', () => {
  const payment = tx({
    type: 'credit_card_payment',
    amount: 50,
    creditId: 'card-1',
    accountId: 'acc-1',
    date: '2026-07-20',
    category: 'credit',
    categoryLabel: 'Crédito',
  });
  const balance = calculateAccountBalance({
    account: { id: 'acc-1', initialBalance: 500 },
    transactions: [payment],
  });
  assert.equal(balance, 450);
  assert.equal(calculateCreditCardImpact(payment, 'card-1'), -50);
});

test('4. pagamento do cartão não conta como despesa', () => {
  const txs = [
    tx({
      type: 'credit_card_purchase',
      amount: 50,
      creditId: 'card-1',
      date: '2026-07-05',
    }),
    tx({
      type: 'credit_card_payment',
      amount: 50,
      creditId: 'card-1',
      accountId: 'acc-1',
      date: '2026-07-20',
      category: 'credit',
      categoryLabel: 'Crédito',
    }),
  ];
  assert.equal(getExpenseTotal(txs, JULY), 50);
});

test('5. reembolso no cartão reduz dívida', () => {
  const refund = tx({
    type: 'credit_card_refund',
    amount: 20,
    creditId: 'card-1',
    date: '2026-07-12',
    category: 'refund',
    categoryLabel: 'Reembolso',
  });
  assert.equal(calculateCreditCardImpact(refund, 'card-1'), -20);
});

test('6. reembolso não conta como receita', () => {
  const refund = tx({
    type: 'credit_card_refund',
    amount: 20,
    creditId: 'card-1',
    date: '2026-07-12',
    category: 'refund',
    categoryLabel: 'Reembolso',
  });
  assert.equal(getIncomeTotal([refund], JULY), 0);
  assert.equal(calculateBudgetImpact(refund).countsAsIncome, false);
});

test('7. reembolso reduz despesa líquida se ligado ao movimento original', () => {
  const purchase = tx({
    type: 'credit_card_purchase',
    amount: 80,
    creditId: 'card-1',
    date: '2026-07-08',
    category: 'groceries',
    categoryLabel: 'Supermercado',
  });
  const refund = tx({
    type: 'credit_card_refund',
    amount: 20,
    creditId: 'card-1',
    date: '2026-07-09',
    category: 'groceries',
    categoryLabel: 'Supermercado',
  });
  const impact = calculateRefundImpact(refund, purchase);
  assert.equal(impact.netExpenseReduction, 20);
  assert.equal(getExpenseTotal([purchase, refund], JULY), 60);
});

test('8. transferência não afeta receitas/despesas', () => {
  const transfer = tx({
    type: 'transfer',
    amount: 100,
    accountId: 'acc-1',
    destinationAccountId: 'acc-2',
    date: '2026-07-11',
    category: 'transfer',
    categoryLabel: 'Transferência',
  });
  assert.equal(getExpenseTotal([transfer], JULY), 0);
  assert.equal(getIncomeTotal([transfer], JULY), 0);
});

test('9. goal contribution não afeta despesas', () => {
  const goalLike = toSpendableMovement(
    tx({
      type: 'expense',
      amount: 30,
      accountId: 'acc-1',
      date: '2026-07-03',
    }),
  );
  assert.ok(goalLike);
  assert.equal(calculateNetSpending([], JULY), 0);
  assert.equal(toSpendableMovement(tx({ type: 'transfer', amount: 10, date: '2026-07-03' })), null);
});

test('10. calendário ignora pagamentos de cartão e transferências', () => {
  const txs = [
    tx({
      type: 'credit_card_payment',
      amount: 50,
      creditId: 'card-1',
      accountId: 'acc-1',
      date: '2026-07-15',
      category: 'credit',
      categoryLabel: 'Crédito',
    }),
    tx({
      type: 'transfer',
      amount: 100,
      accountId: 'acc-1',
      destinationAccountId: 'acc-2',
      date: '2026-07-15',
      category: 'transfer',
      categoryLabel: 'Transferência',
    }),
  ];
  assert.equal(calendarSpendingDelta(txs[0]), 0);
  assert.equal(calendarSpendingDelta(txs[1]), 0);
  const calendar = buildSpendingCalendar(txs, '2026-07');
  assert.equal(calendar.find((c) => c.day === 15)?.amount ?? 0, 0);
});

test('11. calendário inclui compras com cartão', () => {
  const txs = [
    tx({
      type: 'credit_card_purchase',
      amount: 40,
      creditId: 'card-1',
      date: '2026-07-07',
    }),
  ];
  assert.equal(calendarSpendingDelta(txs[0]), 40);
  const calendar = buildSpendingCalendar(txs, '2026-07');
  assert.equal(calendar.find((c) => c.day === 7)?.amount, 40);
});
