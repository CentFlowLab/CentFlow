import assert from 'node:assert/strict';
import test from 'node:test';

import { toTransactionInsert, toTransactionUpdatePatch } from '@/lib/supabase/mappers';
import {
  pickTransactionInsertPayload,
  pickTransactionUpdatePayload,
  withLocalMerchant,
} from '@/lib/supabase/transaction-payload';

test('pickTransactionInsertPayload omite merchant quando coluna desactivada', () => {
  const payload = pickTransactionInsertPayload({
    user_id: 'user-1',
    type: 'expense',
    amount: 12.5,
    category: 'food',
    description: 'Almoço',
    merchant: 'Continente',
    transaction_date: '2026-06-30',
    currency: 'EUR',
    receipt_id: null,
    unexpected_field: 'não enviar',
  });

  assert.equal(payload.merchant, undefined);
  assert.equal('merchant' in payload, false);
  assert.equal('unexpected_field' in payload, false);
  assert.equal(payload.user_id, 'user-1');
  assert.equal(payload.amount, 12.5);
});

test('pickTransactionInsertPayload aceita merchant vazio sem enviar coluna', () => {
  const payload = pickTransactionInsertPayload({
    user_id: 'user-1',
    type: 'expense',
    amount: 5,
    category: 'food',
    description: null,
    merchant: null,
    transaction_date: '2026-06-30',
    currency: 'EUR',
    receipt_id: null,
  });

  assert.equal('merchant' in payload, false);
});

test('pickTransactionUpdatePayload omite merchant quando coluna desactivada', () => {
  const payload = pickTransactionUpdatePayload({
    type: 'expense',
    amount: 20,
    category: 'food',
    description: 'Jantar',
    merchant: 'Pingo Doce',
    transaction_date: '2026-06-30',
    rogue: true,
  });

  assert.equal('merchant' in payload, false);
  assert.equal('rogue' in payload, false);
  assert.equal(payload.amount, 20);
});

test('toTransactionInsert não envia merchant ao Supabase com coluna desactivada', () => {
  const payload = toTransactionInsert('user-1', {
    type: 'expense',
    amount: 9.99,
    category: 'food',
    description: 'Snack',
    merchant: 'Minipreço',
    date: '2026-06-30',
  });

  assert.equal('merchant' in payload, false);
  assert.equal(payload.user_id, 'user-1');
  assert.equal(payload.amount, 9.99);
});

test('toTransactionInsert funciona sem merchant preenchido', () => {
  const payload = toTransactionInsert('user-1', {
    type: 'expense',
    amount: 3.5,
    category: 'transport',
    date: '2026-06-30',
  });

  assert.equal('merchant' in payload, false);
  assert.equal(payload.category, 'transport');
});

test('toTransactionUpdatePatch não envia merchant ao Supabase com coluna desactivada', () => {
  const payload = toTransactionUpdatePatch({
    type: 'expense',
    amount: 15,
    category: 'food',
    merchant: 'Lidl',
    date: '2026-06-30',
  });

  assert.equal('merchant' in payload, false);
  assert.equal(payload.amount, 15);
});

test('withLocalMerchant preserva merchant na resposta quando coluna desactivada', () => {
  const enriched = withLocalMerchant(
    {
      id: 'tx-1',
      type: 'expense',
      amount: 10,
      category: 'food',
      categoryLabel: 'Alimentação',
      date: '2026-06-30',
      currency: 'EUR',
    },
    'Galp',
  );

  assert.equal(enriched.merchant, 'Galp');
});

test('withLocalMerchant ignora merchant vazio', () => {
  const base = {
    id: 'tx-1',
    type: 'expense' as const,
    amount: 10,
    category: 'food',
    categoryLabel: 'Alimentação',
    date: '2026-06-30',
    currency: 'EUR',
  };

  assert.equal(withLocalMerchant(base, ''), base);
  assert.equal(withLocalMerchant(base, '   '), base);
});
