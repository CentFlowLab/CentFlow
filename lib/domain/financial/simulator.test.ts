import assert from 'node:assert/strict';
import test from 'node:test';

import type { BankAccount } from '@/lib/domain/account.types';
import type { Subscription } from '@/lib/domain/assets.types';
import type { Credit } from '@/lib/domain/types';
import type { Transaction } from '@/lib/domain/transaction.types';

import { calculateFinancialState } from './financial-state';
import {
  buildScenarioFromSuggestionId,
  creditUtilizationAfterPayment,
  simulateFinancialDecision,
} from './simulator';
import { createTestFinancialState } from './test-financial-state.fixture';

const AS_OF = new Date('2026-06-15T12:00:00');

function account(partial: Partial<BankAccount> & Pick<BankAccount, 'id'>): BankAccount {
  return {
    name: partial.name ?? 'Conta',
    type: partial.type ?? 'checking',
    currency: 'EUR',
    initialBalance: partial.initialBalance ?? 0,
    isActive: partial.isActive ?? true,
    budgetEnabled: partial.budgetEnabled,
    ...partial,
  };
}

function tx(partial: Pick<Transaction, 'type' | 'amount' | 'date'> & Partial<Transaction>): Transaction {
  return {
    id: partial.id ?? `tx-${partial.date}`,
    description: partial.description ?? 'Test',
    category: partial.category ?? 'other',
    categoryLabel: partial.categoryLabel ?? 'Outros',
    currency: 'EUR',
    ...partial,
  };
}

function baseState(overrides: Partial<Parameters<typeof calculateFinancialState>[0]> = {}) {
  return calculateFinancialState({ transactions: [], today: AS_OF, ...overrides });
}

test('1. simular amortização não altera dados reais', () => {
  const accounts = [
    account({ id: 'inv', name: 'Robinhood', type: 'investment', initialBalance: 7011.72, budgetEnabled: false }),
    account({ id: 'chk', name: 'Moey', type: 'checking', initialBalance: 1000, budgetEnabled: true }),
  ];
  const credits: Credit[] = [
    {
      id: 'loan1',
      name: 'Crédito Pessoal',
      outstandingBalance: 17133.55,
      monthlyPayment: 250,
      interestRateAnnual: 11.29,
      creditType: 'personal',
    },
  ];

  const stateBefore = baseState({ accounts, credits });
  const result = simulateFinancialDecision({
    financialState: stateBefore,
    scenario: { type: 'amortize_credit', creditId: 'loan1', accountId: 'inv', amount: 1000 },
  });

  const stateAfter = baseState({ accounts, credits });
  assert.equal(stateAfter.credits[0]?.outstandingBalance, 17133.55);
  assert.equal(stateAfter.accounts.find((a) => a.id === 'inv')?.balance, 7011.72);
  assert.equal(result.after.credits[0]?.balance, 16133.55);
  assert.equal(result.after.accounts.find((a) => a.id === 'inv')?.balance, 6011.72);
  assert.equal(result.isReadOnly, true);
});

test('2. simular pagamento cartão não duplica despesa', () => {
  const accounts = [account({ id: 'a1', initialBalance: 2000, budgetEnabled: true })];
  const credits: Credit[] = [
    {
      id: 'card1',
      name: 'Visa',
      outstandingBalance: 500,
      originalAmount: 5000,
      creditType: 'card',
    },
  ];

  const state = baseState({
    accounts,
    credits,
    transactions: [
      tx({ id: '1', type: 'credit_card_purchase', amount: 200, date: '2026-06-10', creditId: 'card1' }),
    ],
  });

  const result = simulateFinancialDecision({
    financialState: state,
    scenario: { type: 'pay_credit_card', creditId: 'card1', accountId: 'a1', amount: 200 },
  });

  assert.equal(result.after.monthlyExpenses, state.cashFlow.monthlyExpenses);
  assert.ok(result.explanation.unchanged.some((line) => line.includes('consumo')));
});

test('3. simular objetivo baixa orçamento simulado', () => {
  const accounts = [account({ id: 'a1', initialBalance: 1500, budgetEnabled: true })];
  const state = baseState({
    accounts,
    goals: [{ id: 'g1', name: 'Férias', target: 3000, current: 500 }],
  });

  const result = simulateFinancialDecision({
    financialState: state,
    scenario: { type: 'contribute_goal', goalId: 'g1', accountId: 'a1', amount: 200 },
  });

  assert.ok(result.after.availableThisMonth < result.before.availableThisMonth);
  assert.equal(result.after.goals[0]?.current, 700);
});

test('4. simular cancelamento recorrente aumenta disponível futuro', () => {
  const subscriptions: Subscription[] = [
    { id: 'sub1', name: 'Net Vodafone', amount: 28, billingInterval: 'monthly' },
  ];
  const state = baseState({
    accounts: [account({ id: 'a1', initialBalance: 500, budgetEnabled: true })],
    subscriptions,
  });

  const result = simulateFinancialDecision({
    financialState: state,
    scenario: { type: 'cancel_subscription', subscriptionId: 'sub1' },
  });

  assert.ok(result.after.availableThisMonth > result.before.availableThisMonth);
  assert.ok(result.explanation.summary.includes('28'));
});

test('5. simular transferência investimento baixa orçamento mas mantém património', () => {
  const accounts = [
    account({ id: 'chk', initialBalance: 2000, budgetEnabled: true }),
    account({ id: 'inv', name: 'Invest', type: 'investment', initialBalance: 1000, budgetEnabled: false }),
  ];
  const state = baseState({ accounts });

  const result = simulateFinancialDecision({
    financialState: state,
    scenario: {
      type: 'transfer_to_investment',
      fromAccountId: 'chk',
      toAccountId: 'inv',
      amount: 500,
    },
  });

  assert.ok(result.after.availableThisMonth < result.before.availableThisMonth);
  assert.equal(result.after.netWorth, result.before.netWorth);
});

test('6. simular retirar investimento aumenta orçamento', () => {
  const accounts = [
    account({ id: 'chk', initialBalance: 500, budgetEnabled: true }),
    account({ id: 'inv', type: 'investment', initialBalance: 3000, budgetEnabled: false }),
  ];
  const state = baseState({ accounts });

  const result = simulateFinancialDecision({
    financialState: state,
    scenario: {
      type: 'withdraw_investment',
      fromAccountId: 'inv',
      toAccountId: 'chk',
      amount: 800,
    },
  });

  assert.ok(result.after.availableThisMonth > result.before.availableThisMonth);
});

test('7. simular aumento rendimento aumenta cashflow', () => {
  const state = baseState({
    accounts: [account({ id: 'a1', initialBalance: 1000, budgetEnabled: true })],
    transactions: [
      tx({ id: '1', type: 'income', amount: 1500, date: '2026-06-01', accountId: 'a1' }),
    ],
  });

  const result = simulateFinancialDecision({
    financialState: state,
    scenario: { type: 'increase_monthly_income', amount: 300 },
  });

  assert.ok(result.after.monthlyIncome > result.before.monthlyIncome);
  assert.ok(result.after.availableThisMonth > result.before.availableThisMonth);
});

test('8. simular redução categoria melhora savings rate', () => {
  const state = baseState({
    accounts: [account({ id: 'a1', initialBalance: 1000, budgetEnabled: true })],
    transactions: [
      tx({ id: '1', type: 'income', amount: 2000, date: '2026-06-01', accountId: 'a1' }),
      tx({ id: '2', type: 'expense', amount: 800, date: '2026-06-05', accountId: 'a1', category: 'food' }),
    ],
  });

  const result = simulateFinancialDecision({
    financialState: state,
    scenario: {
      type: 'reduce_category_spending',
      categoryKey: 'food',
      categoryLabel: 'Alimentação',
      reductionPercent: 20,
    },
    categorySpending: { food: 200 },
  });

  assert.ok(result.after.savingsRate >= result.before.savingsRate);
  assert.ok(result.after.monthlyExpenses < result.before.monthlyExpenses);
});

test('9. todas as simulações têm explanation', () => {
  const state = baseState({
    accounts: [
      account({ id: 'a1', initialBalance: 2000, budgetEnabled: true }),
      account({ id: 'inv', type: 'investment', initialBalance: 5000, budgetEnabled: false }),
    ],
    credits: [
      { id: 'c1', name: 'Cartão', outstandingBalance: 300, creditType: 'card', originalAmount: 3000 },
      { id: 'l1', name: 'Empréstimo', outstandingBalance: 5000, creditType: 'personal', monthlyPayment: 200 },
    ],
    goals: [{ id: 'g1', name: 'Meta', target: 1000, current: 200 }],
    subscriptions: [{ id: 's1', name: 'Spotify', amount: 10, billingInterval: 'monthly' }],
  });

  const scenarios = [
    { type: 'amortize_credit' as const, creditId: 'l1', accountId: 'inv', amount: 500 },
    { type: 'pay_credit_card' as const, creditId: 'c1', accountId: 'a1', amount: 100 },
    { type: 'contribute_goal' as const, goalId: 'g1', accountId: 'a1', amount: 50 },
    { type: 'withdraw_goal' as const, goalId: 'g1', accountId: 'a1', amount: 50 },
    { type: 'transfer_to_investment' as const, fromAccountId: 'a1', toAccountId: 'inv', amount: 100 },
    { type: 'withdraw_investment' as const, fromAccountId: 'inv', toAccountId: 'a1', amount: 100 },
    { type: 'cancel_subscription' as const, subscriptionId: 's1' },
    { type: 'increase_monthly_savings' as const, amount: 100 },
    { type: 'reduce_category_spending' as const, categoryKey: 'food', reductionAmount: 20 },
    { type: 'increase_monthly_income' as const, amount: 200 },
  ];

  for (const scenario of scenarios) {
    const result = simulateFinancialDecision({
      financialState: state,
      scenario,
      categorySpending: { food: 100 },
    });
    assert.ok(result.explanation.changes.length > 0 || result.explanation.summary.length > 0);
    assert.ok(result.explanation.summary.length > 0);
  }
});

test('10. todas as simulações têm before/after', () => {
  const state = baseState({
    accounts: [account({ id: 'a1', initialBalance: 1500, budgetEnabled: true })],
    credits: [{ id: 'l1', name: 'Crédito', outstandingBalance: 3000, creditType: 'personal', monthlyPayment: 150 }],
  });

  const result = simulateFinancialDecision({
    financialState: state,
    scenario: { type: 'amortize_credit', creditId: 'l1', accountId: 'a1', amount: 300 },
  });

  assert.ok(result.before);
  assert.ok(result.after);
  assert.ok(result.impact.length > 0);
  assert.ok(result.recommendation.length > 0);
});

test('11. valor zero em amortização lança erro — decisão impossível', () => {
  const state = baseState({
    accounts: [account({ id: 'a1', initialBalance: 1000, budgetEnabled: true })],
    credits: [{ id: 'l1', name: 'Crédito', outstandingBalance: 5000, creditType: 'personal' }],
  });
  assert.throws(
    () =>
      simulateFinancialDecision({
        financialState: state,
        scenario: { type: 'amortize_credit', creditId: 'l1', accountId: 'a1', amount: 0 },
      }),
    /Valor inválido/,
  );
});

test('12. saldo insuficiente em contribuição objetivo', () => {
  const state = baseState({
    accounts: [account({ id: 'a1', initialBalance: 50, budgetEnabled: true })],
    goals: [{ id: 'g1', name: 'Meta', target: 1000, current: 0 }],
  });
  assert.throws(
    () =>
      simulateFinancialDecision({
        financialState: state,
        scenario: { type: 'contribute_goal', goalId: 'g1', accountId: 'a1', amount: 200 },
      }),
    /Saldo insuficiente/,
  );
});

test('13. pagamento cartão em crédito não-cartão lança erro', () => {
  const state = baseState({
    accounts: [account({ id: 'a1', initialBalance: 1000, budgetEnabled: true })],
    credits: [{ id: 'l1', name: 'Empréstimo', outstandingBalance: 3000, creditType: 'personal' }],
  });
  assert.throws(
    () =>
      simulateFinancialDecision({
        financialState: state,
        scenario: { type: 'pay_credit_card', creditId: 'l1', accountId: 'a1', amount: 100 },
      }),
    /não é cartão/,
  );
});

test('14. orçamento negativo gera warning NEGATIVE_BUDGET', () => {
  const state = baseState({
    accounts: [account({ id: 'a1', initialBalance: 100, budgetEnabled: true })],
  });
  const result = simulateFinancialDecision({
    financialState: state,
    scenario: { type: 'increase_monthly_savings', amount: 500 },
  });
  assert.ok(result.warnings.some((w) => w.code === 'NEGATIVE_BUDGET'));
  assert.match(result.recommendation, /negativo|adia/i);
});

test('15. amortização com pouca liquidez — warning LOW_LIQUIDITY', () => {
  const state = baseState({
    accounts: [account({ id: 'a1', initialBalance: 250, budgetEnabled: true })],
    credits: [
      {
        id: 'l1',
        name: 'Crédito',
        outstandingBalance: 5000,
        creditType: 'personal',
        monthlyPayment: 200,
        interestRateAnnual: 10,
      },
    ],
  });
  const result = simulateFinancialDecision({
    financialState: state,
    scenario: { type: 'amortize_credit', creditId: 'l1', accountId: 'a1', amount: 100 },
  });
  assert.ok(result.warnings.some((w) => w.code === 'LOW_LIQUIDITY'));
  assert.ok(result.explanation.benefits.some((b) => b.includes('Juros futuros')));
});

test('16. cancelamento subscrição anual — summary com valor mensalizado', () => {
  const state = baseState({
    accounts: [account({ id: 'a1', initialBalance: 800, budgetEnabled: true })],
    subscriptions: [{ id: 's1', name: 'Office 365', amount: 120, billingInterval: 'annual' }],
  });
  const result = simulateFinancialDecision({
    financialState: state,
    scenario: { type: 'cancel_subscription', subscriptionId: 's1' },
  });
  assert.match(result.explanation.summary, /Office 365/);
  assert.match(result.explanation.summary, /ano/i);
});

test('17. redução categoria com reductionAmount zero lança erro', () => {
  const state = baseState({
    accounts: [account({ id: 'a1', initialBalance: 1000, budgetEnabled: true })],
  });
  assert.throws(
    () =>
      simulateFinancialDecision({
        financialState: state,
        scenario: { type: 'reduce_category_spending', categoryKey: 'food', reductionAmount: 0 },
        categorySpending: { food: 100 },
      }),
    /Redução inválida/,
  );
});

test('18. simulação determinística — mesmo input produz mesmo output', () => {
  const state = baseState({
    accounts: [account({ id: 'a1', initialBalance: 2000, budgetEnabled: true })],
    credits: [{ id: 'l1', name: 'Crédito', outstandingBalance: 1000, creditType: 'personal' }],
  });
  const input = {
    financialState: state,
    scenario: { type: 'amortize_credit' as const, creditId: 'l1', accountId: 'a1', amount: 200 },
  };
  const a = simulateFinancialDecision(input);
  const b = simulateFinancialDecision(input);
  assert.deepEqual(a.after, b.after);
  assert.deepEqual(a.before, b.before);
  assert.equal(state.netWorth.netWorth, baseState({
    accounts: [account({ id: 'a1', initialBalance: 2000, budgetEnabled: true })],
    credits: [{ id: 'l1', name: 'Crédito', outstandingBalance: 1000, creditType: 'personal' }],
  }).netWorth.netWorth);
});

test('19. creditUtilizationAfterPayment — utilização após pagamento', () => {
  const credit: Credit = {
    id: 'c1',
    name: 'Visa',
    outstandingBalance: 400,
    originalAmount: 2000,
    creditType: 'card',
  };
  const utilization = creditUtilizationAfterPayment(credit, 200);
  assert.ok(utilization !== null);
  assert.ok(utilization! < 100);
});

test('20. buildScenarioFromSuggestionId — fin-amort com sugestão válida', () => {
  const state = createTestFinancialState({
    asOf: AS_OF,
    accounts: [
      {
        id: 'inv',
        name: 'Invest',
        type: 'investment',
        balance: 5000,
        initialBalance: 5000,
        currency: 'EUR',
        isActive: true,
        budgetEnabledResolved: false,
      },
    ],
    credits: [
      {
        id: 'loan1',
        name: 'Crédito',
        outstandingBalance: 10000,
        creditType: 'personal',
        monthlyPayment: 300,
      },
    ],
    financialSuggestions: [
      {
        id: 'fin-amort-loan1',
        title: 'Amortizar',
        reason: 'TAEG alta',
        dataUsed: ['dívida'],
        scenarios: [{ percent: 10, amount: 500, interestSaved: 50, monthsSaved: 2 }],
        disclaimer: 'Teste',
        type: 'savings',
        priority: 1,
      },
    ],
  });
  const scenario = buildScenarioFromSuggestionId('fin-amort-loan1', state);
  assert.ok(scenario);
  assert.equal(scenario?.type, 'amortize_credit');
  if (scenario?.type === 'amortize_credit') {
    assert.equal(scenario.amount, 500);
    assert.equal(scenario.creditId, 'loan1');
  }
});

test('21. buildScenarioFromSuggestionId — fin-high-taeg sem conta devolve null', () => {
  const state = createTestFinancialState({
    asOf: AS_OF,
    accounts: [],
    credits: [{ id: 'loan1', name: 'Crédito', outstandingBalance: 5000, creditType: 'personal' }],
  });
  assert.equal(buildScenarioFromSuggestionId('fin-high-taeg-loan1', state), null);
});

test('22. impacto neutro em transferência investimento — património e título', () => {
  const state = baseState({
    accounts: [
      account({ id: 'chk', initialBalance: 1500, budgetEnabled: true }),
      account({ id: 'inv', type: 'investment', initialBalance: 3000, budgetEnabled: false }),
    ],
  });
  const result = simulateFinancialDecision({
    financialState: state,
    scenario: { type: 'transfer_to_investment', fromAccountId: 'chk', toAccountId: 'inv', amount: 1 },
  });
  assert.match(result.title, /investimento/i);
  assert.equal(result.after.netWorth, result.before.netWorth);
  assert.ok(result.explanation.unchanged.some((line) => line.includes('Património')));
});

test('23. amortizar desde conta sem orçamento — orçamento inalterado', () => {
  const state = baseState({
    accounts: [
      account({ id: 'inv', type: 'investment', initialBalance: 3000, budgetEnabled: false }),
      account({ id: 'chk', initialBalance: 500, budgetEnabled: true }),
    ],
    credits: [{ id: 'l1', name: 'Crédito', outstandingBalance: 8000, creditType: 'personal', monthlyPayment: 200 }],
  });
  const beforeAvailable = state.availableThisMonth;
  const result = simulateFinancialDecision({
    financialState: state,
    scenario: { type: 'amortize_credit', creditId: 'l1', accountId: 'inv', amount: 500 },
  });
  assert.equal(result.after.availableThisMonth, beforeAvailable);
});

test('24. increase_monthly_savings — explanation e recomendação', () => {
  const state = baseState({
    accounts: [account({ id: 'a1', initialBalance: 800, budgetEnabled: true })],
  });
  const result = simulateFinancialDecision({
    financialState: state,
    scenario: { type: 'increase_monthly_savings', amount: 50 },
  });
  assert.ok(result.explanation.changes.some((c) => c.includes('Disponível mensal reduz')));
  assert.ok(result.explanation.benefits.some((b) => b.includes('Taxa de poupança')));
});

test('25. buildScenarioFromSuggestionId — fin-high-taeg com conta válida', () => {
  const state = createTestFinancialState({
    asOf: AS_OF,
    accounts: [
      {
        id: 'chk',
        name: 'Corrente',
        type: 'checking',
        balance: 2000,
        initialBalance: 2000,
        currency: 'EUR',
        isActive: true,
        budgetEnabledResolved: true,
      },
    ],
    credits: [
      {
        id: 'loan1',
        name: 'Crédito',
        outstandingBalance: 10000,
        creditType: 'personal',
        interestRateAnnual: 12,
      },
    ],
  });
  const scenario = buildScenarioFromSuggestionId('fin-high-taeg-loan1', state);
  assert.ok(scenario);
  assert.equal(scenario?.type, 'amortize_credit');
});

test('26. subscrição trimestral — cancelamento mensaliza valor', () => {
  const state = baseState({
    accounts: [account({ id: 'a1', initialBalance: 600, budgetEnabled: true })],
    subscriptions: [{ id: 's1', name: 'Adobe', amount: 90, billingInterval: 'quarterly' }],
  });
  const result = simulateFinancialDecision({
    financialState: state,
    scenario: { type: 'cancel_subscription', subscriptionId: 's1' },
  });
  assert.ok(result.after.availableThisMonth > result.before.availableThisMonth);
});

test('27. withdraw_goal — risco de colchão da meta', () => {
  const state = baseState({
    accounts: [account({ id: 'a1', initialBalance: 1000, budgetEnabled: true })],
    goals: [{ id: 'g1', name: 'Reserva', target: 2000, current: 800 }],
  });
  const result = simulateFinancialDecision({
    financialState: state,
    scenario: { type: 'withdraw_goal', goalId: 'g1', accountId: 'a1', amount: 200 },
  });
  assert.ok(result.explanation.risks.some((r) => r.includes('meta')));
  assert.equal(result.after.goals[0]?.current, 600);
});

test('28. amortização sem juros estimados — não adiciona benefício de poupança', () => {
  const state = baseState({
    accounts: [account({ id: 'a1', initialBalance: 5000, budgetEnabled: true })],
    credits: [
      {
        id: 'l1',
        name: 'Sem taxa',
        outstandingBalance: 1000,
        creditType: 'personal',
        monthlyPayment: 0,
        interestRateAnnual: 0,
      },
    ],
  });
  const result = simulateFinancialDecision({
    financialState: state,
    scenario: { type: 'amortize_credit', creditId: 'l1', accountId: 'a1', amount: 100 },
  });
  assert.equal(
    result.explanation.benefits.filter((b) => b.includes('Juros futuros')).length,
    0,
  );
});

test('29. último dia do mês — daysRemaining zero não divide por zero', () => {
  const state = createTestFinancialState({
    asOf: new Date('2026-06-30T12:00:00'),
    availableThisMonth: 300,
    dailySafeSpend: 300,
    budget: {
      ...createTestFinancialState().budget,
      daysRemaining: 0,
      available: 300,
      dailySafeSpend: 300,
    },
    accounts: [
      {
        id: 'a1',
        name: 'Conta',
        type: 'checking',
        balance: 300,
        initialBalance: 300,
        currency: 'EUR',
        isActive: true,
        budgetEnabledResolved: true,
      },
    ],
  });
  const result = simulateFinancialDecision({
    financialState: state,
    scenario: { type: 'increase_monthly_income', amount: 100 },
  });
  assert.ok(Number.isFinite(result.after.dailySafeSpend));
});

test('30. amortização com dívida baixa — recomendação específica', () => {
  const state = baseState({
    accounts: [account({ id: 'a1', initialBalance: 3000, budgetEnabled: true })],
    credits: [{ id: 'l1', name: 'Pequeno', outstandingBalance: 500, creditType: 'personal', monthlyPayment: 50 }],
  });
  const result = simulateFinancialDecision({
    financialState: state,
    scenario: { type: 'amortize_credit', creditId: 'l1', accountId: 'a1', amount: 200 },
  });
  assert.match(result.recommendation, /liquidez|dívida/i);
});

test('31. reduce_category_spending — benefits na explicação', () => {
  const state = baseState({
    accounts: [account({ id: 'a1', initialBalance: 1200, budgetEnabled: true })],
    transactions: [
      tx({ id: '1', type: 'income', amount: 2000, date: '2026-06-01', accountId: 'a1' }),
      tx({ id: '2', type: 'expense', amount: 600, date: '2026-06-08', accountId: 'a1', category: 'transport', categoryLabel: 'Transportes' }),
    ],
  });
  const result = simulateFinancialDecision({
    financialState: state,
    scenario: {
      type: 'reduce_category_spending',
      categoryKey: 'transport',
      categoryLabel: 'Transportes',
      reductionAmount: 50,
    },
    categorySpending: { transport: 150 },
  });
  assert.ok(result.explanation.benefits.some((b) => b.includes('Taxa de poupança')));
  assert.ok(result.impact.some((line) => line.label === 'Taxa de poupança' || line.label === 'Despesas mensais'));
});
