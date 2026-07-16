/**
 * Matriz de estabilização — 20 cenários financeiros.
 * Cada cenário valida consistência via calculateFinancialState (fonte única).
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import type { BankAccount } from '@/lib/domain/account.types';
import type { GoalContribution } from '@/lib/domain/goal-contribution.types';
import type { Transaction } from '@/lib/domain/transaction.types';
import type { Credit, InventoryItem } from '@/lib/domain/types';
import type { Goal } from '@/lib/domain/assets.types';

import { calculateFinancialState } from './financial-state';
import { diagnoseFinancialState } from './financial-doctor';

const AS_OF = new Date('2026-07-15T12:00:00');

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

function tx(
  partial: Pick<Transaction, 'type' | 'amount' | 'date'> & Partial<Transaction>,
): Transaction {
  return {
    id: partial.id ?? `tx-${partial.date}-${partial.amount}-${partial.type}`,
    description: partial.description ?? 'Test',
    category: partial.category ?? 'other',
    categoryLabel: partial.categoryLabel ?? 'Outros',
    currency: partial.currency ?? 'EUR',
    ...partial,
  };
}

function runState(input: {
  accounts?: BankAccount[];
  transactions?: Transaction[];
  credits?: Credit[];
  goals?: Goal[];
  goalContributions?: GoalContribution[];
  loanPayments?: Parameters<typeof calculateFinancialState>[0]['loanPayments'];
  inventory?: InventoryItem[];
}) {
  const before = calculateFinancialState({
    accounts: input.accounts ?? [],
    transactions: input.transactions ?? [],
    credits: input.credits ?? [],
    goals: input.goals ?? [],
    goalContributions: input.goalContributions ?? [],
    loanPayments: input.loanPayments ?? [],
    inventory: input.inventory ?? [],
    subscriptions: [],
    today: AS_OF,
  });

  const diagnosis = diagnoseFinancialState(before, {
    transactions: input.transactions ?? [],
    accounts: input.accounts ?? [],
    goalContributions: input.goalContributions ?? [],
    loanPayments: input.loanPayments ?? [],
    credits: input.credits ?? [],
    subscriptions: [],
    goals: input.goals,
    inventory: input.inventory,
  });

  return { state: before, diagnosis };
}

// ─── CENÁRIO 1 — Receber salário ───────────────────────────────────────────
test('C1 — receber salário aumenta conta, orçamento, património e cashflow', () => {
  const accounts = [account({ id: 'a1', initialBalance: 0, budgetEnabled: true })];
  const transactions = [
    tx({ id: 'sal', type: 'income', amount: 2000, date: '2026-07-01', accountId: 'a1', category: 'salary', categoryLabel: 'Salário' }),
  ];

  const { state, diagnosis } = runState({ accounts, transactions });

  assert.equal(state.accounts[0]?.balance, 2000);
  assert.equal(state.availableThisMonth, 2000);
  assert.equal(state.netWorth.netWorth, 2000);
  assert.equal(state.cashFlow.monthlyIncome, 2000);
  assert.ok(diagnosis.isHealthy);
});

// ─── CENÁRIO 2 — Despesa normal ────────────────────────────────────────────
test('C2 — despesa normal baixa conta, orçamento e património', () => {
  const accounts = [account({ id: 'a1', initialBalance: 1000, budgetEnabled: true })];
  const transactions = [
    tx({ id: 'exp', type: 'expense', amount: 120, date: '2026-07-10', accountId: 'a1', category: 'food', categoryLabel: 'Comida' }),
  ];

  const { state } = runState({ accounts, transactions });

  assert.equal(state.accounts[0]?.balance, 880);
  assert.equal(state.availableThisMonth, 880);
  assert.equal(state.netWorth.netWorth, 880);
  assert.equal(state.cashFlow.monthlyExpenses, 120);
  assert.equal(state.budget.consumptionSpending, 120);
});

// ─── CENÁRIO 3 — Compra cartão ─────────────────────────────────────────────
test('C3 — compra cartão aumenta dívida e gastos; orçamento e conta inalterados', () => {
  const credit: Credit = {
    id: 'card1',
    name: 'Visa',
    creditType: 'card',
    outstandingBalance: 0,
    originalAmount: 5000,
    monthlyPayment: 0,
    interestRateAnnual: 0,
  };
  const accounts = [account({ id: 'a1', initialBalance: 1000, budgetEnabled: true })];
  const transactions = [
    tx({ id: 'buy', type: 'credit_card_purchase', amount: 250, date: '2026-07-08', creditId: 'card1' }),
  ];

  const { state } = runState({ accounts, transactions, credits: [credit] });

  assert.equal(state.accounts[0]?.balance, 1000);
  assert.equal(state.availableThisMonth, 1000);
  assert.equal(state.creditCards[0]?.debt, 250);
  assert.equal(state.budget.consumptionSpending, 250);
  assert.equal(state.netWorth.netWorth, 750);
});

// ─── CENÁRIO 4 — Pagamento cartão ──────────────────────────────────────────
test('C4 — pagamento cartão baixa conta, dívida e orçamento; gastos não aumentam', () => {
  const credit: Credit = {
    id: 'card1',
    name: 'Visa',
    creditType: 'card',
    outstandingBalance: 300,
    originalAmount: 5000,
    monthlyPayment: 0,
    interestRateAnnual: 0,
  };
  const accounts = [account({ id: 'a1', initialBalance: 1000, budgetEnabled: true })];
  const transactions = [
    tx({ id: 'buy', type: 'credit_card_purchase', amount: 300, date: '2026-07-05', creditId: 'card1' }),
    tx({ id: 'pay', type: 'credit_card_payment', amount: 200, date: '2026-07-10', accountId: 'a1', creditId: 'card1', category: 'credit', categoryLabel: 'Crédito' }),
  ];

  const { state } = runState({ accounts, transactions, credits: [credit] });

  assert.equal(state.accounts[0]?.balance, 800);
  assert.equal(state.availableThisMonth, 800);
  assert.equal(state.creditCards[0]?.debt, 100);
  assert.equal(state.budget.consumptionSpending, 300);
  assert.equal(state.budget.components.creditCardPayments, 200);
});

// ─── CENÁRIO 5 — Transferência orçamento → orçamento ───────────────────────
test('C5 — transferência entre contas de orçamento mantém património e orçamento', () => {
  const accounts = [
    account({ id: 'a1', name: 'Principal', initialBalance: 800, budgetEnabled: true }),
    account({ id: 'a2', name: 'Poupança', initialBalance: 200, budgetEnabled: true }),
  ];
  const transactions = [
    tx({ id: 'tr', type: 'transfer', amount: 100, date: '2026-07-10', accountId: 'a1', destinationAccountId: 'a2' }),
  ];

  const { state } = runState({ accounts, transactions });

  assert.equal(state.netWorth.netWorth, 1000);
  assert.equal(state.availableThisMonth, 1000);
  assert.equal(state.accounts.find((a) => a.id === 'a1')?.balance, 700);
  assert.equal(state.accounts.find((a) => a.id === 'a2')?.balance, 300);
});

// ─── CENÁRIO 6 — Transferência orçamento → investimento ─────────────────────
test('C6 — transferência para investimento baixa orçamento, património igual', () => {
  const accounts = [
    account({ id: 'a1', initialBalance: 1000, budgetEnabled: true }),
    account({ id: 'inv', type: 'investment', initialBalance: 0, budgetEnabled: false }),
  ];
  const transactions = [
    tx({ id: 'tr', type: 'transfer', amount: 300, date: '2026-07-10', accountId: 'a1', destinationAccountId: 'inv' }),
  ];

  const { state } = runState({ accounts, transactions });

  assert.equal(state.netWorth.netWorth, 1000);
  assert.equal(state.availableThisMonth, 700);
  assert.equal(state.budget.components.movedOutOfBudget, 300);
  assert.equal(state.accounts.find((a) => a.id === 'inv')?.balance, 300);
});

// ─── CENÁRIO 7 — Transferência investimento → orçamento ────────────────────
test('C7 — transferência de investimento para orçamento aumenta disponível', () => {
  const accounts = [
    account({ id: 'a1', initialBalance: 500, budgetEnabled: true }),
    account({ id: 'inv', type: 'investment', initialBalance: 400, budgetEnabled: false }),
  ];
  const transactions = [
    tx({ id: 'tr', type: 'transfer', amount: 150, date: '2026-07-12', accountId: 'inv', destinationAccountId: 'a1' }),
  ];

  const { state } = runState({ accounts, transactions });

  assert.equal(state.netWorth.netWorth, 900);
  assert.equal(state.availableThisMonth, 650);
  assert.equal(state.budget.components.movedIntoBudget, 150);
});

// ─── CENÁRIO 8 — Adicionar dinheiro a objetivo ─────────────────────────────
test('C8 — contribuição a objetivo baixa conta e orçamento; património igual', () => {
  const accounts = [account({ id: 'a1', initialBalance: 1000, budgetEnabled: true })];
  const goals: Goal[] = [{ id: 'g1', name: 'Férias', current: 0, target: 2000 }];
  const goalContributions: GoalContribution[] = [
    { id: 'gc1', goalId: 'g1', accountId: 'a1', amount: 200, createdAt: '2026-07-10T10:00:00Z', kind: 'contribution' },
  ];

  const { state } = runState({ accounts, transactions: [], goals, goalContributions });

  assert.equal(state.accounts[0]?.balance, 800);
  assert.equal(state.availableThisMonth, 800);
  assert.equal(state.goalProgress[0]?.current, 200);
  assert.equal(state.netWorth.netWorth, 1000);
});

// ─── CENÁRIO 9 — Retirar dinheiro de objetivo ──────────────────────────────
test('C9 — levantamento de objetivo aumenta conta e orçamento; património igual', () => {
  const accounts = [account({ id: 'a1', initialBalance: 1000, budgetEnabled: true })];
  const goals: Goal[] = [{ id: 'g1', name: 'Férias', current: 200, target: 2000 }];
  const goalContributions: GoalContribution[] = [
    { id: 'gc1', goalId: 'g1', accountId: 'a1', amount: 200, createdAt: '2026-07-01T10:00:00Z', kind: 'contribution' },
    { id: 'gc2', goalId: 'g1', accountId: 'a1', amount: 50, createdAt: '2026-07-12T10:00:00Z', kind: 'withdrawal' },
  ];

  const { state } = runState({ accounts, transactions: [], goals, goalContributions });

  assert.equal(state.accounts[0]?.balance, 850);
  assert.equal(state.availableThisMonth, 850);
  assert.equal(state.goalProgress[0]?.current, 150);
  assert.equal(state.netWorth.netWorth, 1000);
});

// ─── CENÁRIO 10 — Mensalidade crédito ──────────────────────────────────────
test('C10 — mensalidade de empréstimo baixa conta, orçamento e dívida', () => {
  const accounts = [account({ id: 'a1', initialBalance: 2000, budgetEnabled: true })];
  const credits: Credit[] = [
    { id: 'loan1', name: 'Habitação', creditType: 'mortgage', outstandingBalance: 100000, monthlyPayment: 500 },
  ];
  const loanPayments = [
    {
      id: 'lp1',
      creditId: 'loan1',
      accountId: 'a1',
      type: 'monthly_payment' as const,
      amount: 500,
      principalAmount: 400,
      interestAmount: 100,
      paidAt: '2026-07-05T10:00:00Z',
    },
  ];

  const { state } = runState({ accounts, transactions: [], credits, loanPayments });

  assert.equal(state.accounts[0]?.balance, 1500);
  assert.equal(state.availableThisMonth, 1500);
  assert.equal(state.budget.components.loanPaymentsPaid, 500);
  assert.equal(state.budget.components.financialCharges, 100);
});

// ─── CENÁRIO 11 — Amortização ───────────────────────────────────────────────
test('C11 — amortização extra baixa conta e dívida sem aumentar consumo', () => {
  const accounts = [account({ id: 'a1', initialBalance: 5000, budgetEnabled: true })];
  const credits: Credit[] = [
    { id: 'loan1', name: 'Auto', creditType: 'auto', outstandingBalance: 10000, monthlyPayment: 200 },
  ];
  const loanPayments = [
    {
      id: 'lp1',
      creditId: 'loan1',
      accountId: 'a1',
      type: 'extra_principal_payment' as const,
      amount: 1000,
      paidAt: '2026-07-08T10:00:00Z',
    },
  ];

  const { state } = runState({ accounts, transactions: [], credits, loanPayments });

  assert.equal(state.accounts[0]?.balance, 4000);
  assert.equal(state.availableThisMonth, 4000);
  assert.equal(state.budget.components.loanAmortizationsPaid, 1000);
  assert.equal(state.budget.consumptionSpending, 0);
});

// ─── CENÁRIO 12 — Reembolso cartão ─────────────────────────────────────────
test('C12 — reembolso cartão reduz dívida e gasto líquido', () => {
  const credit: Credit = {
    id: 'card1',
    name: 'Visa',
    creditType: 'card',
    outstandingBalance: 200,
    originalAmount: 5000,
    monthlyPayment: 0,
    interestRateAnnual: 0,
  };
  const transactions = [
    tx({ id: 'buy', type: 'credit_card_purchase', amount: 200, date: '2026-07-05', creditId: 'card1' }),
    tx({ id: 'ref', type: 'credit_card_refund', amount: 50, date: '2026-07-10', creditId: 'card1' }),
  ];

  const { state } = runState({ accounts: [], transactions, credits: [credit] });

  assert.equal(state.creditCards[0]?.debt, 150);
  assert.equal(state.budget.consumptionSpending, 150);
});

// ─── CENÁRIO 13 — Importação Open Banking (sem duplicados) ─────────────────
test('C13 — importação open banking idempotente por id externo', () => {
  const accounts = [account({ id: 'a1', initialBalance: 0, budgetEnabled: true })];
  const transactions = [
    tx({ id: 'ob-1', type: 'income', amount: 500, date: '2026-07-03', accountId: 'a1', description: 'Transferência OB' }),
    tx({ id: 'ob-2', type: 'expense', amount: 30, date: '2026-07-04', accountId: 'a1', category: 'food', categoryLabel: 'Comida' }),
  ];

  const first = runState({ accounts, transactions });
  const second = runState({ accounts, transactions });

  assert.equal(first.state.netWorth.netWorth, second.state.netWorth.netWorth);
  assert.equal(first.state.availableThisMonth, 470);
  assert.ok(first.diagnosis.isHealthy);
});

// ─── CENÁRIO 14 — OCR (movimento confirmado) ───────────────────────────────
test('C14 — movimento OCR confirmado regista despesa corretamente', () => {
  const accounts = [account({ id: 'a1', initialBalance: 500, budgetEnabled: true })];
  const transactions = [
    tx({
      id: 'ocr-1',
      type: 'expense',
      amount: 42.5,
      date: '2026-07-11',
      accountId: 'a1',
      category: 'groceries',
      categoryLabel: 'Supermercado',
      description: 'Pingo Doce',
      merchant: 'Pingo Doce',
    }),
  ];

  const { state } = runState({ accounts, transactions });

  assert.equal(state.accounts[0]?.balance, 457.5);
  assert.equal(state.budget.consumptionSpending, 42.5);
});

// ─── CENÁRIO 15 — Eliminar movimento ───────────────────────────────────────
test('C15 — eliminar movimento restaura estado anterior', () => {
  const accounts = [account({ id: 'a1', initialBalance: 1000, budgetEnabled: true })];
  const withExpense = [
    tx({ id: 'exp', type: 'expense', amount: 100, date: '2026-07-10', accountId: 'a1' }),
  ];
  const baseline = runState({ accounts, transactions: [] });
  const after = runState({ accounts, transactions: withExpense });
  const restored = runState({ accounts, transactions: [] });

  assert.notEqual(after.state.availableThisMonth, baseline.state.availableThisMonth);
  assert.equal(restored.state.availableThisMonth, baseline.state.availableThisMonth);
  assert.equal(restored.state.netWorth.netWorth, baseline.state.netWorth.netWorth);
});

// ─── CENÁRIO 16 — Editar movimento ─────────────────────────────────────────
test('C16 — editar valor de movimento recalcula tudo', () => {
  const accounts = [account({ id: 'a1', initialBalance: 1000, budgetEnabled: true })];
  const original = [tx({ id: 'exp', type: 'expense', amount: 50, date: '2026-07-10', accountId: 'a1' })];
  const edited = [tx({ id: 'exp', type: 'expense', amount: 150, date: '2026-07-10', accountId: 'a1' })];

  const before = runState({ accounts, transactions: original });
  const after = runState({ accounts, transactions: edited });

  assert.equal(before.state.availableThisMonth - after.state.availableThisMonth, 100);
  assert.equal(before.state.netWorth.netWorth - after.state.netWorth.netWorth, 100);
});

// ─── CENÁRIO 17 — Eliminar conta (sem movimentos) ──────────────────────────
test('C17 — conta sem movimentos pode ser removida sem inconsistência', () => {
  const accounts = [account({ id: 'a1', initialBalance: 0, budgetEnabled: true })];
  const { state, diagnosis } = runState({ accounts, transactions: [] });
  assert.equal(state.accounts.length, 1);
  assert.ok(diagnosis.isHealthy);
});

// ─── CENÁRIO 18 — Eliminar objetivo ───────────────────────────────────────
test('C18 — eliminar objetivo com limpeza de contribuições mantém património', () => {
  const accounts = [account({ id: 'a1', initialBalance: 1000, budgetEnabled: true })];
  const goalContributions: GoalContribution[] = [
    { id: 'gc1', goalId: 'g1', accountId: 'a1', amount: 200, createdAt: '2026-07-05T10:00:00Z', kind: 'contribution' },
  ];

  const withGoal = runState({
    accounts,
    goals: [{ id: 'g1', name: 'Férias', current: 200, target: 1000 }],
    goalContributions,
  });
  const withoutGoal = runState({ accounts, goals: [], goalContributions: [] });

  assert.equal(withGoal.state.netWorth.netWorth, 1000);
  assert.equal(withoutGoal.state.netWorth.netWorth, 1000);
});

// ─── CENÁRIO 19 — Cartão sem movimentos órfãos ─────────────────────────────
test('C19 — cartão referenciado apenas em movimentos válidos', () => {
  const credit: Credit = {
    id: 'card1',
    name: 'Visa',
    creditType: 'card',
    outstandingBalance: 80,
    originalAmount: 3000,
    monthlyPayment: 0,
    interestRateAnnual: 0,
  };
  const transactions = [
    tx({ id: 'buy', type: 'credit_card_purchase', amount: 80, date: '2026-07-08', creditId: 'card1' }),
  ];

  const { state, diagnosis } = runState({ accounts: [], transactions, credits: [credit] });

  assert.equal(state.creditCards[0]?.debt, 80);
  assert.ok(diagnosis.isHealthy);
});

// ─── CENÁRIO 20 — Eliminar crédito (empréstimo pago) ───────────────────────
test('C20 — crédito quitado não distorce património', () => {
  const accounts = [account({ id: 'a1', initialBalance: 3000, budgetEnabled: true })];
  const credits: Credit[] = [
    { id: 'loan1', name: 'Pessoal', creditType: 'personal', outstandingBalance: 0, monthlyPayment: 0 },
  ];

  const { state, diagnosis } = runState({ accounts, transactions: [], credits });

  assert.equal(state.netWorth.netWorth, 3000);
  assert.equal(state.creditSummary.totalDebt, 0);
  assert.ok(diagnosis.isHealthy);
});

// ─── REGRESSÃO — cartão não duplica dívida quando outstandingBalance sincronizado ─
test('REGRESSÃO — outstandingBalance sincronizado não duplica dívida do cartão', () => {
  const credit: Credit = {
    id: 'card1',
    name: 'Visa',
    creditType: 'card',
    outstandingBalance: 200,
    originalAmount: 5000,
    monthlyPayment: 0,
    interestRateAnnual: 0,
  };
  const transactions = [
    tx({ id: 'buy', type: 'credit_card_purchase', amount: 200, date: '2026-07-05', creditId: 'card1' }),
  ];

  const { state } = runState({ accounts: [], transactions, credits: [credit] });

  assert.equal(state.creditCards[0]?.debt, 200, 'dívida deve ser 200, não 400');
  assert.equal(state.netWorth.totalLiabilities, 200);
});
