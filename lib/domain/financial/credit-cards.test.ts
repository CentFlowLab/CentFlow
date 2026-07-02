import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyCreditBalanceDelta,
  calculateAvailableCredit,
  calculateCreditCardBalance,
  calculateCreditUtilization,
  creditBalanceDeltaForTransaction,
  isCreditCardExpense,
  isCreditCardPaymentTransaction,
  recordCreditCardPayment,
  recordCreditCardPurchase,
} from '@/lib/domain/financial/credit-cards';
import { getExpenseTotal } from '@/lib/domain/financial/transactions';
import { calculateNetWorth } from '@/lib/domain/financial/netWorth';
import { calculateAccountBalance } from '@/lib/domain/financial/accounts';

const JULY = { kind: 'month' as const, monthKey: '2026-07', asOf: new Date(2026, 6, 15) };

const card = {
  id: 'card-1',
  outstandingBalance: 200,
  originalAmount: 2000,
};

test('calculateCreditCardBalance — dívida actual', () => {
  assert.equal(calculateCreditCardBalance(card), 200);
});

test('calculateAvailableCredit — limite menos dívida', () => {
  assert.equal(calculateAvailableCredit(card), 1800);
});

test('calculateAvailableCredit — limite excedido devolve 0 (alerta na UI)', () => {
  const overLimit = { ...card, outstandingBalance: 2100, originalAmount: 2000 };
  assert.equal(calculateAvailableCredit(overLimit), 0);
});

test('calculateCreditUtilization — percentagem', () => {
  assert.equal(calculateCreditUtilization(card), 10);
});

test('recordCreditCardPurchase — aumenta dívida', () => {
  const result = recordCreditCardPurchase({ credit: card, amount: 50 });
  assert.equal(result.newBalance, 250);
});

test('recordCreditCardPayment — reduz dívida e conta', () => {
  const result = recordCreditCardPayment({
    credit: card,
    amount: 50,
    fromAccountBalance: 500,
  });
  assert.equal(result.newCreditBalance, 150);
  assert.equal(result.newAccountBalance, 450);
});

test('compra no cartão conta como despesa', () => {
  const txs = [
    {
      id: '1',
      type: 'expense' as const,
      amount: 50,
      creditId: 'card-1',
      date: '2026-07-10',
      category: 'food',
      categoryLabel: 'Comida',
      currency: 'EUR',
    },
  ];
  assert.equal(getExpenseTotal(txs, JULY), 50);
  assert.equal(isCreditCardExpense(txs[0]), true);
});

test('pagamento do cartão não conta como despesa', () => {
  const txs = [
    {
      id: '1',
      type: 'expense' as const,
      amount: 50,
      creditId: 'card-1',
      date: '2026-07-05',
      category: 'food',
      categoryLabel: 'Comida',
      currency: 'EUR',
    },
    {
      id: '2',
      type: 'credit_payment' as const,
      amount: 50,
      creditId: 'card-1',
      accountId: 'acc-1',
      date: '2026-07-20',
      category: 'credit',
      categoryLabel: 'Crédito',
      currency: 'EUR',
    },
  ];
  assert.equal(getExpenseTotal(txs, JULY), 50);
  assert.equal(isCreditCardPaymentTransaction(txs[1]), true);
});

test('compra no cartão não reduz saldo da conta', () => {
  const balance = calculateAccountBalance({
    account: { id: 'acc-1', initialBalance: 500 },
    transactions: [
      {
        id: '1',
        type: 'expense',
        amount: 50,
        creditId: 'card-1',
        date: '2026-07-10',
        category: 'food',
        categoryLabel: 'Comida',
        currency: 'EUR',
      },
    ],
  });
  assert.equal(balance, 500);
});

test('pagamento do cartão reduz saldo da conta', () => {
  const balance = calculateAccountBalance({
    account: { id: 'acc-1', initialBalance: 500 },
    transactions: [
      {
        id: '2',
        type: 'credit_payment',
        amount: 50,
        creditId: 'card-1',
        accountId: 'acc-1',
        date: '2026-07-20',
        category: 'credit',
        categoryLabel: 'Crédito',
        currency: 'EUR',
      },
    ],
  });
  assert.equal(balance, 450);
});

test('creditBalanceDeltaForTransaction — apply e reverse', () => {
  const purchase = { type: 'expense' as const, amount: 50, creditId: 'c1' };
  assert.equal(creditBalanceDeltaForTransaction(purchase, 'apply'), 50);
  assert.equal(creditBalanceDeltaForTransaction(purchase, 'reverse'), -50);

  const payment = { type: 'credit_payment' as const, amount: 50, creditId: 'c1' };
  assert.equal(creditBalanceDeltaForTransaction(payment, 'apply'), -50);
  assert.equal(creditBalanceDeltaForTransaction(payment, 'reverse'), 50);
});

test('eliminar pagamento reverte dívida do cartão', () => {
  const credit = { id: 'c1', name: 'Visa', outstandingBalance: 150 } as import('@/lib/domain/types').Credit;
  const delta = creditBalanceDeltaForTransaction(
    { type: 'credit_payment', amount: 50, creditId: 'c1' },
    'reverse',
  );
  const restored = applyCreditBalanceDelta(credit, delta);
  assert.equal(restored.outstandingBalance, 200);
});

test('património reflete dívida do cartão', () => {
  const nw = calculateNetWorth({
    accounts: [{ id: '1', name: 'A', balance: 500, currency: 'EUR' }],
    credits: [{ id: 'c1', name: 'Visa', outstandingBalance: 200 }],
    inventory: [],
    investments: [],
  });
  assert.equal(nw.netWorth, 300);
});
