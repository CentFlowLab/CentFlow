import type { MonthlyAvailableBreakdown } from './monthly-available';
import type { NetWorthResult } from '@/lib/domain/types';

import { formatMoney } from './money';

export type BudgetExplanationLine = {
  label: string;
  amount: number;
  sign: '+' | '-' | '=';
};

export type BudgetExplanation = {
  title: string;
  result: number;
  lines: BudgetExplanationLine[];
  formula: string;
};

export type NetWorthExplanationLine = {
  label: string;
  amount: number;
  sign: '+' | '-';
};

export type NetWorthExplanation = {
  title: string;
  result: number;
  lines: NetWorthExplanationLine[];
  formula: string;
};

/** Explica «Disponível este mês» de forma transparente. */
export function explainMonthlyAvailable(breakdown: MonthlyAvailableBreakdown): BudgetExplanation {
  const c = breakdown.components;
  const lines: BudgetExplanationLine[] = [
    { label: 'Saldo em contas de gasto corrente', amount: c.budgetAccountBalance, sign: '=' },
  ];

  if (c.incomeReceived > 0) {
    lines.push({ label: 'Receitas registadas (informativo)', amount: c.incomeReceived, sign: '+' });
  }
  if (c.registeredExpenses > 0) {
    lines.push({ label: 'Despesas em conta', amount: c.registeredExpenses, sign: '-' });
  }
  if (c.creditCardPayments > 0) {
    lines.push({ label: 'Pagamentos de cartão', amount: c.creditCardPayments, sign: '-' });
  }
  if (c.goalReserved > 0) {
    lines.push({ label: 'Reservado em objetivos', amount: c.goalReserved, sign: '-' });
  }
  if (c.loanPaymentsPaid > 0) {
    lines.push({ label: 'Mensalidades de crédito', amount: c.loanPaymentsPaid, sign: '-' });
  }
  if (c.loanAmortizationsPaid > 0) {
    lines.push({ label: 'Amortizações extra', amount: c.loanAmortizationsPaid, sign: '-' });
  }
  if (c.futureObligations > 0) {
    lines.push({ label: 'Obrigações futuras', amount: c.futureObligations, sign: '-' });
  }

  lines.push({ label: 'Disponível', amount: breakdown.available, sign: '=' });

  const formula = [
    `${formatMoney(c.budgetAccountBalance)} saldo`,
    c.futureObligations > 0 ? `− ${formatMoney(c.futureObligations)} obrigações` : null,
    `= ${formatMoney(breakdown.available)}`,
  ]
    .filter(Boolean)
    .join(' ');

  return {
    title: 'Disponível este mês',
    result: breakdown.available,
    lines,
    formula,
  };
}

/** Explica património líquido. */
export function explainNetWorth(netWorth: NetWorthResult): NetWorthExplanation {
  const b = netWorth.breakdown;
  const lines: NetWorthExplanationLine[] = [];

  if (b.accounts > 0) lines.push({ label: 'Contas', amount: b.accounts, sign: '+' });
  if (b.investments > 0) lines.push({ label: 'Investimentos', amount: b.investments, sign: '+' });
  if (b.savings > 0) lines.push({ label: 'Objetivos reservados', amount: b.savings, sign: '+' });
  if (b.inventory > 0) lines.push({ label: 'Inventário', amount: b.inventory, sign: '+' });
  if (b.liabilities > 0) lines.push({ label: 'Créditos e cartões', amount: b.liabilities, sign: '-' });

  return {
    title: 'Património líquido',
    result: netWorth.netWorth,
    lines,
    formula: `${formatMoney(netWorth.totalAssets)} activos − ${formatMoney(netWorth.totalLiabilities)} passivos = ${formatMoney(netWorth.netWorth)}`,
  };
}
