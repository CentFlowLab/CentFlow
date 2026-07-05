import assert from 'node:assert/strict';
import test from 'node:test';

import type { Credit } from '@/lib/domain/types';

import {
  convertCardTanMonthlyToEffectiveAnnual,
  pickPriorityDebtTarget,
  resolveDebtEffectiveAnnualRate,
} from './debt-priority';

function credit(partial: Partial<Credit> & Pick<Credit, 'id'>): Credit {
  return {
    name: partial.name ?? 'Crédito',
    outstandingBalance: partial.outstandingBalance ?? 1000,
    creditType: partial.creditType ?? 'personal',
    ...partial,
  };
}

test('convertCardTanMonthlyToEffectiveAnnual — composto 12 meses', () => {
  const annual = convertCardTanMonthlyToEffectiveAnnual(1.5);
  assert.ok(annual > 18 && annual < 20);
});

test('pickPriorityDebtTarget — fallback cartão sem TAN', () => {
  const card = credit({
    id: 'card1',
    name: 'Gold',
    creditType: 'card',
    outstandingBalance: 4664,
  });
  const loan = credit({
    id: 'loan1',
    name: 'Pessoal',
    creditType: 'personal',
    outstandingBalance: 17133,
    interestRateAnnual: 11.29,
  });

  const target = pickPriorityDebtTarget([loan, card]);
  assert.equal(target?.id, 'card1');
});

test('pickPriorityDebtTarget — compara TAEG quando ambos têm taxa', () => {
  const card = credit({
    id: 'card1',
    creditType: 'card',
    outstandingBalance: 1000,
    interestRateAnnual: 0.5,
  });
  const loan = credit({
    id: 'loan1',
    creditType: 'personal',
    outstandingBalance: 5000,
    interestRateAnnual: 11,
  });

  const target = pickPriorityDebtTarget([loan, card]);
  assert.equal(target?.id, 'loan1');
});

test('resolveDebtEffectiveAnnualRate — cartão null sem TAN', () => {
  assert.equal(
    resolveDebtEffectiveAnnualRate(credit({ id: 'c', creditType: 'card' })),
    null,
  );
});
