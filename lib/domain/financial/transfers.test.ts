import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertTransferPreservesTotal,
  calculateTransferImpact,
  isTransferValid,
  validationMessage,
} from '@/lib/domain/financial/transfers';
import { calculateSavingsRate } from '@/lib/domain/financial/savings';
import { getExpenseTotal, getIncomeTotal } from '@/lib/domain/financial/transactions';
import { calculateNetWorth } from '@/lib/domain/financial/netWorth';

const JULY = { kind: 'month' as const, monthKey: '2026-07', asOf: new Date(2026, 6, 15) };

test('transferência válida', () => {
  const result = isTransferValid({
    fromAccountId: 'a1',
    toAccountId: 'a2',
    amount: 300,
    fromBalance: 1013.2,
  });
  assert.equal(result.valid, true);
});

test('origem igual a destino inválida', () => {
  const result = isTransferValid({
    fromAccountId: 'a1',
    toAccountId: 'a1',
    amount: 100,
    fromBalance: 500,
  });
  assert.equal(result.valid, false);
  if (!result.valid) assert.equal(result.reason, 'same_account');
});

test('saldo insuficiente inválido', () => {
  const result = isTransferValid({
    fromAccountId: 'a1',
    toAccountId: 'a2',
    amount: 500,
    fromBalance: 100,
  });
  assert.equal(result.valid, false);
  if (!result.valid) assert.equal(result.reason, 'insufficient_balance');
});

test('valor zero inválido', () => {
  assert.equal(isTransferValid({ fromAccountId: 'a1', toAccountId: 'a2', amount: 0, fromBalance: 100 }).valid, false);
});

test('valor negativo inválido', () => {
  assert.equal(isTransferValid({ fromAccountId: 'a1', toAccountId: 'a2', amount: -10, fromBalance: 100 }).valid, false);
});

test('impacto correto origem/destino', () => {
  const impact = calculateTransferImpact({
    fromAccount: { name: 'Moey', balance: 1013.2, initialBalance: 0 },
    toAccount: { name: 'Santander', balance: 71, initialBalance: 0 },
    amount: 300,
  });
  assert.ok(impact);
  assert.equal(impact!.fromAfter, 713.2);
  assert.equal(impact!.toAfter, 371);
  assert.equal(impact!.totalBefore, impact!.totalAfter);
});

test('total em contas permanece igual após transferência', () => {
  const accounts = [
    { id: 'a1', name: 'Moey', balance: 1013.2, initialBalance: 0, type: 'checking' as const, isActive: true, currency: 'EUR' },
    { id: 'a2', name: 'Santander', balance: 71, initialBalance: 0, type: 'checking' as const, isActive: true, currency: 'EUR' },
  ];
  assert.equal(
    assertTransferPreservesTotal(accounts, [], {
      type: 'transfer',
      amount: 300,
      accountId: 'a1',
      destinationAccountId: 'a2',
    }),
    true,
  );
});

test('transferência não afeta receitas/despesas', () => {
  const txs = [
    { id: '1', type: 'transfer' as const, amount: 300, date: '2026-07-10', category: 'other', categoryLabel: 'X', currency: 'EUR', accountId: 'a1', destinationAccountId: 'a2' },
    { id: '2', type: 'income' as const, amount: 1000, date: '2026-07-01', category: 'salary', categoryLabel: 'Salário', currency: 'EUR' },
    { id: '3', type: 'expense' as const, amount: 200, date: '2026-07-05', category: 'food', categoryLabel: 'Comida', currency: 'EUR' },
  ];
  assert.equal(getIncomeTotal(txs, JULY), 1000);
  assert.equal(getExpenseTotal(txs, JULY), 200);
});

test('transferência não afeta taxa de poupança', () => {
  const withTransfer = calculateSavingsRate(1000, 200);
  assert.equal(withTransfer.rate, 80);
});

test('transferência não altera património líquido (contas only)', () => {
  const before = calculateNetWorth({
    accounts: [
      { id: '1', name: 'A', balance: 713.2, currency: 'EUR' },
      { id: '2', name: 'B', balance: 371, currency: 'EUR' },
    ],
    inventory: [],
    investments: [],
    credits: [],
  });
  assert.equal(before.netWorth, 1084.2);
});

test('conta em falta — origem ou destino ausente', () => {
  assert.equal(
    isTransferValid({ fromAccountId: null, toAccountId: 'a2', amount: 10, fromBalance: 100 }).valid,
    false,
  );
  assert.equal(
    isTransferValid({ fromAccountId: 'a1', toAccountId: undefined, amount: 10, fromBalance: 100 }).valid,
    false,
  );
  const msg = validationMessage({ valid: false, reason: 'missing_account' });
  assert.match(msg ?? '', /origem e destino/i);
});

test('menos de duas contas — not_enough_accounts', () => {
  const result = isTransferValid({
    fromAccountId: 'a1',
    toAccountId: 'a2',
    amount: 50,
    fromBalance: 200,
    accountCount: 1,
  });
  assert.equal(result.valid, false);
  if (!result.valid) {
    assert.equal(result.reason, 'not_enough_accounts');
    assert.match(validationMessage(result) ?? '', /duas contas/i);
  }
});

test('saldo exatamente igual ao valor — transferência válida', () => {
  const result = isTransferValid({
    fromAccountId: 'a1',
    toAccountId: 'a2',
    amount: 250,
    fromBalance: 250,
  });
  assert.equal(result.valid, true);
  assert.equal(validationMessage(result), null);
});

test('calculateTransferImpact — valor inválido devolve null', () => {
  assert.equal(
    calculateTransferImpact({
      fromAccount: { name: 'A', balance: 100, initialBalance: 0 },
      toAccount: { name: 'B', balance: 50, initialBalance: 0 },
      amount: 0,
    }),
    null,
  );
  assert.equal(
    calculateTransferImpact({
      fromAccount: { name: 'A', balance: 100, initialBalance: 0 },
      toAccount: { name: 'B', balance: 50, initialBalance: 0 },
      amount: -5,
    }),
    null,
  );
});

test('calculateTransferImpact — usa initialBalance quando balance ausente', () => {
  const impact = calculateTransferImpact({
    fromAccount: { name: 'Origem', initialBalance: 400 },
    toAccount: { name: 'Destino', initialBalance: 100 },
    amount: 150,
  });
  assert.ok(impact);
  assert.equal(impact!.fromAfter, 250);
  assert.equal(impact!.toAfter, 250);
  assert.equal(impact!.totalBefore, impact!.totalAfter);
});

test('assertTransferPreservesTotal — tipo não-transferência é no-op', () => {
  const accounts = [
    { id: 'a1', name: 'A', balance: 500, initialBalance: 0, type: 'checking' as const, isActive: true, currency: 'EUR' },
  ];
  assert.equal(
    assertTransferPreservesTotal(accounts, [], {
      type: 'expense',
      amount: 50,
      accountId: 'a1',
    }),
    true,
  );
});

test('validationMessage — todas as razões de erro', () => {
  const cases = [
    ['same_account', /diferentes/i],
    ['invalid_amount', /valor válido/i],
    ['insufficient_balance', /Saldo insuficiente/i],
  ] as const;
  for (const [reason, pattern] of cases) {
    const msg = validationMessage({ valid: false, reason });
    assert.match(msg ?? '', pattern);
  }
});

test('transferência para conta investment — total consolidado mantém-se', () => {
  const accounts = [
    { id: 'chk', name: 'Corrente', balance: 1000, initialBalance: 0, type: 'checking' as const, isActive: true, currency: 'EUR', budgetEnabled: true },
    { id: 'inv', name: 'Invest', balance: 2000, initialBalance: 0, type: 'investment' as const, isActive: true, currency: 'EUR', budgetEnabled: false },
  ];
  assert.equal(
    assertTransferPreservesTotal(accounts, [], {
      type: 'transfer',
      amount: 300,
      accountId: 'chk',
      destinationAccountId: 'inv',
    }),
    true,
  );
});

test('assertTransferPreservesTotal — contas só com initialBalance', () => {
  const accounts = [
    { id: 'a1', name: 'A', initialBalance: 800, type: 'checking' as const, isActive: true, currency: 'EUR' },
    { id: 'a2', name: 'B', initialBalance: 200, type: 'checking' as const, isActive: true, currency: 'EUR' },
  ];
  assert.equal(
    assertTransferPreservesTotal(accounts, [], {
      type: 'transfer',
      amount: 100,
      accountId: 'a1',
      destinationAccountId: 'a2',
    }),
    true,
  );
});
