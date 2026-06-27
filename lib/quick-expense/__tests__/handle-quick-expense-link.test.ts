import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  mapCategoryKey,
  normalizeCategoryKey,
  parseQuickExpenseUrl,
} from '@/lib/quick-expense/handle-quick-expense-link';

const BASE = 'centflow://quick-expense?';

test('amount=25&category=food → { amount: 25, category: food }', () => {
  assert.deepEqual(parseQuickExpenseUrl(`${BASE}amount=25&category=food`), {
    amount: 25,
    category: 'food',
  });
});

test('amount=25.50&category=Alimentação → { amount: 25.5, category: food }', () => {
  assert.deepEqual(parseQuickExpenseUrl(`${BASE}amount=25.50&category=Alimenta%C3%A7%C3%A3o`), {
    amount: 25.5,
    category: 'food',
  });
});

test('aceita também só a query string (sem scheme)', () => {
  assert.deepEqual(parseQuickExpenseUrl('amount=10&category=transport'), {
    amount: 10,
    category: 'transport',
  });
});

test('amount=0 é inválido → null', () => {
  assert.equal(parseQuickExpenseUrl(`${BASE}amount=0&category=food`), null);
});

test('amount=-10 é inválido → null', () => {
  assert.equal(parseQuickExpenseUrl(`${BASE}amount=-10&category=food`), null);
});

test('amount=abc é inválido → null', () => {
  assert.equal(parseQuickExpenseUrl(`${BASE}amount=abc&category=food`), null);
});

test('sem amount → null', () => {
  assert.equal(parseQuickExpenseUrl(`${BASE}category=food`), null);
});

test('category desconhecida → fallback other', () => {
  assert.deepEqual(parseQuickExpenseUrl(`${BASE}amount=5&category=unknown`), {
    amount: 5,
    category: 'other',
  });
});

test('sem category → fallback other', () => {
  assert.deepEqual(parseQuickExpenseUrl(`${BASE}amount=5`), {
    amount: 5,
    category: 'other',
  });
});

test('note URL-encoded é descodificada', () => {
  assert.deepEqual(parseQuickExpenseUrl(`${BASE}amount=5&category=food&note=Almo%C3%A7o`), {
    amount: 5,
    category: 'food',
    note: 'Almoço',
  });
});

test('note é truncada a 100 caracteres', () => {
  const longNote = 'a'.repeat(200);
  const result = parseQuickExpenseUrl(`${BASE}amount=5&category=food&note=${longNote}`);
  assert.ok(result);
  assert.equal(result?.note?.length, 100);
});

test('note com caracteres perigosos é sanitizada', () => {
  const result = parseQuickExpenseUrl(`${BASE}amount=5&category=food&note=%3Cscript%3Eoi`);
  assert.equal(result?.note, 'scriptoi');
});

test('amount com vírgula decimal é aceite', () => {
  assert.deepEqual(parseQuickExpenseUrl(`${BASE}amount=12,30&category=shopping`), {
    amount: 12.3,
    category: 'shopping',
  });
});

test('normalizeCategoryKey reconhece PT e EN, case-insensitive', () => {
  assert.equal(normalizeCategoryKey('Habitação'), 'home');
  assert.equal(normalizeCategoryKey('HOME'), 'home');
  assert.equal(normalizeCategoryKey('Subscrições'), 'subscriptions');
  assert.equal(normalizeCategoryKey(undefined), 'other');
});

test('mapCategoryKey mapeia key canónica → id da app', () => {
  assert.equal(mapCategoryKey('food'), 'food');
  assert.equal(mapCategoryKey('home'), 'housing');
  assert.equal(mapCategoryKey('Habitação'), 'housing');
  assert.equal(mapCategoryKey('unknown'), 'other');
});
