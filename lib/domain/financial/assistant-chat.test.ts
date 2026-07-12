import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ASSISTANT_FAQ,
  buildAssistantMotorSnapshot,
  executeAssistantQuery,
} from './assistant-chat';
import { classifyAssistantIntentLocally } from './assistant-chat.client';
import type { FinancialState } from './financial-state.types';

const AS_OF = new Date('2026-07-10T12:00:00');

function stubState(): FinancialState {
  return {
    asOf: AS_OF,
    availableThisMonth: 800,
    dailySafeSpend: 45,
    budget: { daysRemaining: 18 } as FinancialState['budget'],
    cashFlow: {
      monthlyIncome: 2200,
      monthlyExpenses: 1400,
      net: 800,
      savingsRate: 0.36,
      weeklySpending: 300,
    },
    creditSummary: { totalDebt: 5000, monthlyPayments: 250, cardCount: 0, loanCount: 1 },
    goalProgress: [{ id: 'g1', name: 'Férias', current: 200, target: 1000, percent: 20, remaining: 800, isComplete: false }],
  } as FinancialState;
}

test('classifyAssistantIntentLocally — quanto posso gastar hoje', () => {
  const result = classifyAssistantIntentLocally('Quanto posso gastar hoje com segurança?');
  assert.equal(result.intent, 'daily_spend_limit');
});

test('classifyAssistantIntentLocally — posso comprar com valor', () => {
  const result = classifyAssistantIntentLocally('Posso gastar 150€ numa compra?');
  assert.equal(result.intent, 'can_i_buy');
  assert.equal(result.params.amount, 150);
});

test('executeAssistantQuery — daily spend usa motor snapshot', () => {
  const snapshot = buildAssistantMotorSnapshot({ state: stubState(), transactions: [] });
  const result = executeAssistantQuery('daily_spend_limit', {}, snapshot);
  assert.equal(result.supported, true);
  assert.ok(result.facts.dailySafeSpend === 45);
});

test('executeAssistantQuery — unsupported honesto', () => {
  const snapshot = buildAssistantMotorSnapshot({ state: stubState(), transactions: [] });
  const result = executeAssistantQuery('unsupported', {}, snapshot);
  assert.equal(result.supported, false);
  assert.match(result.headline, /ainda não sei/i);
});

test('ASSISTANT_FAQ — perguntas frequentes definidas', () => {
  assert.ok(ASSISTANT_FAQ.length >= 4);
});
