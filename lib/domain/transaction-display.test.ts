import assert from 'node:assert/strict';
import test from 'node:test';

import type { Transaction } from '@/lib/domain/transaction.types';
import {
  buildMovementSubtitle,
  getMovementBadgeLabel,
  resolveMovementSourceName,
} from '@/lib/domain/transaction-display';

function tx(partial: Partial<Transaction> & Pick<Transaction, 'type' | 'amount' | 'date'>): Transaction {
  return {
    id: partial.id ?? 'tx-1',
    category: partial.category ?? 'shopping',
    categoryLabel: partial.categoryLabel ?? 'Compras',
    type: partial.type,
    amount: partial.amount,
    date: partial.date,
    currency: 'EUR',
    accountId: partial.accountId,
    creditId: partial.creditId,
    description: partial.description,
  };
}

test('resolveMovementSourceName — prioriza cartão, fallback conta', () => {
  const accounts = { acc1: 'Moey' };
  const credits = { card1: 'Gold Santander' };

  assert.equal(
    resolveMovementSourceName(
      tx({ type: 'credit_card_purchase', amount: 10, date: '2026-07-03', creditId: 'card1' }),
      accounts,
      credits,
    ),
    'Gold Santander',
  );

  assert.equal(
    resolveMovementSourceName(
      tx({ type: 'expense', amount: 10, date: '2026-07-03', accountId: 'acc1' }),
      accounts,
      credits,
    ),
    'Moey',
  );
});

test('buildMovementSubtitle inclui categoria, data e conta', () => {
  const subtitle = buildMovementSubtitle(
    tx({
      type: 'expense',
      amount: 20,
      date: '2026-07-03',
      accountId: 'acc1',
      category: 'shopping',
      categoryLabel: 'Compras',
    }),
    { accountById: { acc1: 'Unicre' } },
  );

  assert.match(subtitle, /Compras/);
  assert.match(subtitle, /Unicre/);
});

test('badge de compra no cartão mostra nome do cartão, não "Cartão"', () => {
  const badge = getMovementBadgeLabel(
    tx({ type: 'credit_card_purchase', amount: 10, date: '2026-07-03', creditId: 'card1' }),
    {},
    { card1: 'Gold Santander' },
  );

  assert.equal(badge, 'Gold Santander');
});

test('badge null quando compra no cartão sem nome resolvido', () => {
  const badge = getMovementBadgeLabel(
    tx({ type: 'credit_card_purchase', amount: 10, date: '2026-07-03', creditId: 'missing' }),
    {},
    {},
  );

  assert.equal(badge, null);
});
