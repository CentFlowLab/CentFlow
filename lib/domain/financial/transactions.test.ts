import assert from 'node:assert/strict';
import test from 'node:test';

import type { GoalContribution } from '@/lib/domain/goal-contribution.types';
import {
  filterFutureForMonthlyBudget,
  filterFutureTransactions,
  filterOccurredForMonthlyBudget,
  filterOccurredInCalendarMonth,
  filterOccurredTransactions,
  filterTransactionsByPeriod,
  getExpenseTotal,
  getIncomeTotal,
  getMonthlyCashflow,
  getNetCashflow,
  getTopCategory,
  getTopMerchant,
  groupTransactionsByCategory,
  groupTransactionsByDate,
  groupTransactionsByMerchant,
  isRealCashflowTransaction,
  sumGlobalCashBalance,
  sumTransactionCashBalance,
  toSpendableMovement,
  transactionCashDelta,
} from '@/lib/domain/financial/transactions';
import type { LoanPaymentRecord } from '@/lib/domain/financial/loan-payments';
import type { Transaction } from '@/lib/domain/transaction.types';

function tx(
  partial: Pick<Transaction, 'type' | 'amount' | 'date'> & Partial<Transaction>,
): Transaction {
  return {
    id: partial.id ?? 'tx-1',
    description: partial.description ?? 'Test',
    category: partial.category ?? 'other',
    categoryLabel: partial.categoryLabel ?? 'Outros',
    type: partial.type,
    amount: partial.amount,
    date: partial.date,
    currency: 'EUR',
  };
}

const JULY = { kind: 'month' as const, monthKey: '2026-07', asOf: new Date(2026, 6, 15) };

test('getIncomeTotal — receitas por período', () => {
  const transactions = [
    tx({ type: 'income', amount: 1000, date: '2026-07-01' }),
    tx({ type: 'income', amount: 500, date: '2026-06-30' }),
  ];
  assert.equal(getIncomeTotal(transactions, JULY), 1000);
});

test('getExpenseTotal — despesas por período', () => {
  const transactions = [
    tx({ type: 'expense', amount: 200, date: '2026-07-05' }),
    tx({ type: 'expense', amount: 50, date: '2026-06-20' }),
  ];
  assert.equal(getExpenseTotal(transactions, JULY), 200);
});

test('transferências ignoradas em receitas/despesas', () => {
  const transactions = [
    tx({ type: 'transfer', amount: 300, date: '2026-07-02' }),
    tx({ type: 'income', amount: 100, date: '2026-07-02' }),
  ];
  assert.equal(getIncomeTotal(transactions, JULY), 100);
  assert.equal(getExpenseTotal(transactions, JULY), 0);
  assert.equal(transactionCashDelta({ type: 'transfer', amount: 300 }), 0);
});

test('getNetCashflow — líquido do período', () => {
  const transactions = [
    tx({ type: 'income', amount: 1000, date: '2026-07-01' }),
    tx({ type: 'expense', amount: 400, date: '2026-07-10' }),
  ];
  assert.equal(getNetCashflow(transactions, JULY), 600);
});

test('sumTransactionCashBalance — movimentos futuros separados', () => {
  const asOf = new Date(2026, 6, 1);
  const transactions = [
    tx({ type: 'income', amount: 100, date: '2026-07-01' }),
    tx({ type: 'expense', amount: 50, date: '2026-07-15' }),
  ];
  assert.equal(sumTransactionCashBalance(transactions, 'occurred', asOf), 100);
  assert.equal(sumTransactionCashBalance(transactions, 'future', asOf), -50);
  assert.equal(sumTransactionCashBalance(transactions, 'all', asOf), 50);
});

test('isRealCashflowTransaction — só receita e despesa real', () => {
  assert.equal(isRealCashflowTransaction({ type: 'income' }), true);
  assert.equal(isRealCashflowTransaction({ type: 'expense' }), true);
  assert.equal(isRealCashflowTransaction({ type: 'transfer' }), false);
  assert.equal(isRealCashflowTransaction({ type: 'credit_card_purchase', creditId: 'c1' }), false);
  assert.equal(isRealCashflowTransaction({ type: 'credit_card_payment', creditId: 'c1' }), false);
});

test('transactionCashDelta — tipos de movimento e invariáveis', () => {
  assert.equal(transactionCashDelta({ type: 'income', amount: 100 }), 100);
  assert.equal(transactionCashDelta({ type: 'expense', amount: 80 }), -80);
  assert.equal(transactionCashDelta({ type: 'credit_card_payment', amount: 50, creditId: 'c1' }), -50);
  assert.equal(transactionCashDelta({ type: 'credit_card_purchase', amount: 40, creditId: 'c1' }), 0);
  assert.equal(transactionCashDelta({ type: 'credit_card_refund', amount: 20, creditId: 'c1' }), 0);
});

test('filterTransactionsByPeriod e filtros temporais', () => {
  const asOf = new Date(2026, 6, 15);
  const transactions = [
    tx({ id: '1', type: 'income', amount: 100, date: '2026-07-05' }),
    tx({ id: '2', type: 'expense', amount: 30, date: '2026-06-28' }),
    tx({ id: '3', type: 'income', amount: 200, date: '2026-08-01' }),
  ];
  const inJuly = filterTransactionsByPeriod(transactions, JULY);
  assert.equal(inJuly.length, 1);
  assert.equal(filterOccurredTransactions(transactions, asOf).length, 2);
  assert.equal(filterFutureTransactions(transactions, asOf).length, 1);
});

test('getMonthlyCashflow — mês civil de referência', () => {
  const asOf = new Date(2026, 6, 20);
  const transactions = [
    tx({ type: 'income', amount: 1500, date: '2026-07-01' }),
    tx({ type: 'expense', amount: 400, date: '2026-07-12' }),
    tx({ type: 'income', amount: 900, date: '2026-06-30' }),
  ];
  const flow = getMonthlyCashflow(transactions, asOf);
  assert.equal(flow.income, 1500);
  assert.equal(flow.expenses, 400);
});

test('groupTransactionsByDate — agrupa por dia ISO', () => {
  const groups = groupTransactionsByDate([
    tx({ id: '1', type: 'expense', amount: 10, date: '2026-07-05T08:00:00Z' }),
    tx({ id: '2', type: 'expense', amount: 20, date: '2026-07-05T22:00:00Z' }),
    tx({ id: '3', type: 'income', amount: 100, date: '2026-07-06' }),
  ]);
  assert.equal(groups.get('2026-07-05')?.length, 2);
  assert.equal(groups.get('2026-07-06')?.length, 1);
});

test('groupTransactionsByCategory — ignora transferências e pagamentos de cartão', () => {
  const transactions = [
    tx({ id: '1', type: 'expense', amount: 50, date: '2026-07-03', category: 'food', categoryLabel: 'Alimentação' }),
    tx({ id: '2', type: 'transfer', amount: 100, date: '2026-07-04', accountId: 'a1', destinationAccountId: 'a2' }),
    tx({ id: '3', type: 'credit_card_payment', amount: 80, date: '2026-07-05', creditId: 'card1' }),
    tx({ id: '4', type: 'credit_card_purchase', amount: 60, date: '2026-07-06', creditId: 'card1', category: 'shopping', categoryLabel: 'Compras' }),
  ];
  const grouped = groupTransactionsByCategory(transactions, JULY);
  assert.equal(grouped.length, 2);
  assert.equal(grouped[0]?.key, 'shopping');
  assert.equal(grouped[0]?.amount, 60);
  const top = getTopCategory(transactions, JULY);
  assert.equal(top?.key, 'shopping');
});

test('groupTransactionsByCategory — sem despesas devolve vazio', () => {
  const transactions = [
    tx({ id: '1', type: 'income', amount: 100, date: '2026-07-01' }),
    tx({ id: '2', type: 'transfer', amount: 50, date: '2026-07-02' }),
  ];
  assert.deepEqual(groupTransactionsByCategory(transactions, JULY), []);
  assert.equal(getTopCategory(transactions, JULY), null);
});

test('groupTransactionsByMerchant — usa descrição ou categoria', () => {
  const transactions = [
    tx({ id: '1', type: 'expense', amount: 25, date: '2026-07-02', description: 'Continente', category: 'food', categoryLabel: 'Alimentação' }),
    tx({ id: '2', type: 'expense', amount: 15, date: '2026-07-03', description: '', category: 'food', categoryLabel: 'Alimentação' }),
    tx({ id: '3', type: 'credit_card_refund', amount: 10, date: '2026-07-04', creditId: 'c1' }),
  ];
  const merchants = groupTransactionsByMerchant(transactions, JULY);
  assert.ok(merchants.some((m) => m.label === 'Continente'));
  assert.ok(merchants.some((m) => m.label === 'Alimentação'));
  const top = getTopMerchant(transactions, JULY);
  assert.equal(top?.label, 'Continente');
});

test('sumGlobalCashBalance — contribuições, retiradas e pagamentos de empréstimo', () => {
  const asOf = new Date(2026, 6, 15);
  const transactions = [
    tx({ id: '1', type: 'income', amount: 1000, date: '2026-07-01' }),
    tx({ id: '2', type: 'expense', amount: 200, date: '2026-07-10' }),
  ];
  const goalContributions: GoalContribution[] = [
    { id: 'gc1', goalId: 'g1', amount: 100, createdAt: '2026-07-05T10:00:00Z', kind: 'contribution' },
    { id: 'gc2', goalId: 'g1', amount: 50, createdAt: '2026-07-08T10:00:00Z', kind: 'withdrawal' },
  ];
  const loanPayments: LoanPaymentRecord[] = [
    {
      id: 'lp1',
      creditId: 'loan1',
      type: 'monthly_payment',
      amount: 150,
      paidAt: '2026-07-12T09:00:00Z',
    },
  ];
  const balance = sumGlobalCashBalance(transactions, {
    goalContributions,
    loanPayments,
    scope: 'occurred',
    asOf,
  });
  // 1000 - 200 - 100 (contrib) + 50 (retirada) - 150 (empréstimo) = 600
  assert.equal(balance, 600);
});

test('sumGlobalCashBalance — scope future ignora contribuições e empréstimos ocorridos', () => {
  const asOf = new Date(2026, 6, 1);
  const transactions = [tx({ id: '1', type: 'expense', amount: 40, date: '2026-07-20' })];
  const goalContributions: GoalContribution[] = [
    { id: 'gc1', goalId: 'g1', amount: 100, createdAt: '2026-07-05T10:00:00Z' },
  ];
  assert.equal(
    sumGlobalCashBalance(transactions, { goalContributions, scope: 'future', asOf }),
    -40,
  );
});

test('filterOccurredInCalendarMonth e orçamento spendable', () => {
  const ref = new Date(2026, 6, 15);
  const transactions = [
    tx({ id: '1', type: 'income', amount: 500, date: '2026-07-02' }),
    tx({ id: '2', type: 'expense', amount: 80, date: '2026-07-08' }),
    tx({ id: '3', type: 'transfer', amount: 100, date: '2026-07-09', accountId: 'a1', destinationAccountId: 'a2' }),
    tx({ id: '4', type: 'credit_card_purchase', amount: 45, date: '2026-07-10', creditId: 'c1', category: 'food', categoryLabel: 'Alimentação' }),
    tx({ id: '5', type: 'balance_adjustment', amount: 10, date: '2026-07-11' }),
    tx({ id: '6', type: 'income', amount: 200, date: '2026-06-30' }),
  ];
  const inMonth = filterOccurredInCalendarMonth(transactions, ref);
  assert.equal(inMonth.length, 5);
  const spendable = filterOccurredForMonthlyBudget(transactions, ref);
  assert.deepEqual(
    spendable.map((m) => m.type),
    ['income', 'expense', 'expense'],
  );
});

test('filterFutureForMonthlyBudget — só movimentos futuros do mês corrente', () => {
  const ref = new Date(2026, 6, 10);
  const transactions = [
    tx({ id: '1', type: 'expense', amount: 30, date: '2026-07-20' }),
    tx({ id: '2', type: 'expense', amount: 50, date: '2026-08-05' }),
    tx({ id: '3', type: 'credit_card_payment', amount: 100, date: '2026-07-25', creditId: 'c1' }),
  ];
  const future = filterFutureForMonthlyBudget(transactions, ref);
  assert.equal(future.length, 1);
  assert.equal(future[0]?.amount, 30);
});

test('toSpendableMovement — mapeia tipos não orçamentáveis para null', () => {
  assert.equal(toSpendableMovement(tx({ type: 'transfer', amount: 10, date: '2026-07-01' })), null);
  assert.equal(
    toSpendableMovement(tx({ type: 'credit_card_payment', amount: 10, date: '2026-07-01', creditId: 'c1' })),
    null,
  );
  assert.equal(
    toSpendableMovement(tx({ type: 'credit_card_refund', amount: 10, date: '2026-07-01', creditId: 'c1' })),
    null,
  );
  assert.equal(
    toSpendableMovement(tx({ type: 'balance_adjustment', amount: 10, date: '2026-07-01' })),
    null,
  );
  const purchase = toSpendableMovement(
    tx({ type: 'credit_card_purchase', amount: 55, date: '2026-07-05', creditId: 'c1' }),
  );
  assert.deepEqual(purchase, { type: 'expense', amount: 55, date: '2026-07-05' });
});

test('invariante — pagamento de cartão não duplica despesa no período', () => {
  const transactions = [
    tx({ id: '1', type: 'credit_card_purchase', amount: 120, date: '2026-07-04', creditId: 'c1', category: 'food', categoryLabel: 'Alimentação' }),
    tx({ id: '2', type: 'credit_card_payment', amount: 120, date: '2026-07-10', creditId: 'c1' }),
  ];
  assert.equal(getExpenseTotal(transactions, JULY), 120);
});

test('invariante — reembolso reduz consumo líquido', () => {
  const transactions = [
    tx({ id: '1', type: 'credit_card_purchase', amount: 100, date: '2026-07-03', creditId: 'c1', category: 'shopping', categoryLabel: 'Compras' }),
    tx({ id: '2', type: 'credit_card_refund', amount: 30, date: '2026-07-08', creditId: 'c1' }),
  ];
  assert.equal(getExpenseTotal(transactions, JULY), 70);
});

test('sumGlobalCashBalance — scope all inclui contribuições futuras', () => {
  const asOf = new Date(2026, 6, 10);
  const transactions = [tx({ id: '1', type: 'income', amount: 500, date: '2026-07-25' })];
  const goalContributions: GoalContribution[] = [
    { id: 'gc1', goalId: 'g1', amount: 80, createdAt: '2026-07-20T10:00:00Z' },
  ];
  const balance = sumGlobalCashBalance(transactions, {
    goalContributions,
    scope: 'all',
    asOf,
  });
  assert.equal(balance, 420);
});

test('filterFutureForMonthlyBudget — exclui pagamentos de cartão futuros', () => {
  const ref = new Date(2026, 6, 5);
  const transactions = [
    tx({ id: '1', type: 'expense', amount: 25, date: '2026-07-18' }),
    tx({ id: '2', type: 'credit_card_payment', amount: 90, date: '2026-07-22', creditId: 'c1' }),
  ];
  const future = filterFutureForMonthlyBudget(transactions, ref);
  assert.equal(future.length, 1);
  assert.equal(future[0]?.type, 'expense');
});

test('filterFutureForMonthlyBudget — inclui receitas futuras do mês', () => {
  const ref = new Date(2026, 6, 12);
  const transactions = [
    tx({ id: '1', type: 'income', amount: 1200, date: '2026-07-28' }),
    tx({ id: '2', type: 'expense', amount: 40, date: '2026-08-02' }),
  ];
  const future = filterFutureForMonthlyBudget(transactions, ref);
  assert.equal(future.length, 1);
  assert.equal(future[0]?.type, 'income');
  assert.equal(future[0]?.amount, 1200);
});
