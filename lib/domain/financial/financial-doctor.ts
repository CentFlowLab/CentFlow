import type { FinancialState } from './financial-state.types';
import type { Transaction } from '@/lib/domain/transaction.types';

import { buildMonthlyAvailableBreakdown } from './monthly-available.compose';
import { calculateCreditCardBalance } from './credit-cards';
import { creditBalanceDeltaForTransaction } from './credit-cards';
import { isCardCredit } from '@/lib/credit/credit-type.utils';
import { addMoney } from './money';

export type FinancialDiagnosticIssue = {
  code: string;
  severity: 'error' | 'warning';
  message: string;
  details?: string[];
};

export type FinancialDiagnosticReport = {
  generatedAt: string;
  issues: FinancialDiagnosticIssue[];
  isHealthy: boolean;
};

/** Doctor financeiro — detecta divergências entre movimentos e estado calculado. */
export function diagnoseFinancialState(
  state: FinancialState,
  input: {
    transactions: Transaction[];
    accounts: Parameters<typeof buildMonthlyAvailableBreakdown>[0]['accounts'];
    goalContributions: Parameters<typeof buildMonthlyAvailableBreakdown>[0]['goalContributions'];
    loanPayments: Parameters<typeof buildMonthlyAvailableBreakdown>[0]['loanPayments'];
    credits: Parameters<typeof buildMonthlyAvailableBreakdown>[0]['credits'];
    subscriptions: Parameters<typeof buildMonthlyAvailableBreakdown>[0]['subscriptions'];
  },
): FinancialDiagnosticReport {
  const issues: FinancialDiagnosticIssue[] = [];

  const recomputed = buildMonthlyAvailableBreakdown({
    accounts: input.accounts,
    transactions: input.transactions,
    goalContributions: input.goalContributions,
    credits: input.credits,
    subscriptions: input.subscriptions,
    loanPayments: input.loanPayments,
    referenceDate: state.asOf,
  });

  if (Math.abs(recomputed.available - state.availableThisMonth) > 0.01) {
    issues.push({
      code: 'BUDGET_DIVERGENCE',
      severity: 'error',
      message: 'O cálculo do orçamento divergiu.',
      details: [
        `Estado: ${state.availableThisMonth}`,
        `Recalculado: ${recomputed.available}`,
      ],
    });
  }

  for (const cardState of state.creditCards) {
    const credit = input.credits.find((c) => c.id === cardState.credit.id);
    if (!credit) continue;

    let ledgerDebt = calculateCreditCardBalance(credit);
    for (const tx of input.transactions) {
      if (tx.creditId !== credit.id) continue;
      ledgerDebt = addMoney(ledgerDebt, creditBalanceDeltaForTransaction(tx, 'apply'));
    }

    if (Math.abs(ledgerDebt - cardState.debt) > 0.01) {
      issues.push({
        code: 'CARD_BALANCE_MISMATCH',
        severity: 'error',
        message: `O saldo do cartão "${cardState.credit.name}" não corresponde aos movimentos.`,
        details: [`Registado: ${credit.outstandingBalance}`, `Ledger: ${ledgerDebt}`],
      });
    }
  }

  const recomputedNet = state.netWorth.netWorth;
  const explainedNet = state.netWorthExplanation.result;
  if (Math.abs(recomputedNet - explainedNet) > 0.01) {
    issues.push({
      code: 'NET_WORTH_EXPLAIN_MISMATCH',
      severity: 'warning',
      message: 'O património não coincide com a explicação.',
    });
  }

  const orphanGoalTx = input.goalContributions.filter(
    (row) => row.accountId != null && !input.accounts.some((a) => a.id === row.accountId),
  );
  if (orphanGoalTx.length > 0) {
    issues.push({
      code: 'ORPHAN_GOAL_MOVEMENTS',
      severity: 'warning',
      message: 'Existem movimentos de objetivo com conta órfã.',
      details: orphanGoalTx.map((row) => row.id),
    });
  }

  const loanCredits = input.credits.filter((c) => !isCardCredit(c.creditType));
  if (loanCredits.length > 0 && state.creditSummary.loanCount === 0) {
    issues.push({
      code: 'CREDIT_SUMMARY_GAP',
      severity: 'warning',
      message: 'Resumo de crédito não inclui empréstimos registados.',
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    issues,
    isHealthy: issues.filter((i) => i.severity === 'error').length === 0,
  };
}

export function formatDiagnosticReport(report: FinancialDiagnosticReport): string {
  const lines = [
    `# Diagnóstico Financeiro CentFlow`,
    `Gerado: ${report.generatedAt}`,
    `Estado: ${report.isHealthy ? 'OK' : 'Problemas detectados'}`,
    '',
  ];

  if (report.issues.length === 0) {
    lines.push('Nenhuma divergência encontrada.');
    return lines.join('\n');
  }

  for (const issue of report.issues) {
    lines.push(`## [${issue.severity.toUpperCase()}] ${issue.code}`);
    lines.push(issue.message);
    if (issue.details?.length) {
      for (const detail of issue.details) {
        lines.push(`- ${detail}`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}
