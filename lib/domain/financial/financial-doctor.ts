import type { FinancialState } from './financial-state.types';
import type { Transaction } from '@/lib/domain/transaction.types';
import type { GoalContribution } from '@/lib/domain/goal-contribution.types';
import type { BankAccount } from '@/lib/domain/account.types';
import type { Credit } from '@/lib/domain/types';
import type { Subscription } from '@/lib/domain/assets.types';
import type { LoanPaymentRecord } from './loan-payments';

import { buildMonthlyAvailableBreakdown } from './monthly-available.compose';
import { computeCreditCardDebtFromTransactions } from './credit-cards';
import { calculateConsolidatedNetWorth } from './netWorth';
import { enrichAccountsWithBalances } from './accounts';
import { calculateGoalProgress } from './goals';
import { isCardCredit } from '@/lib/credit/credit-type.utils';
import { resolveTransactionKind } from './transaction-kind';

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

export type FinancialDoctorInput = {
  transactions: Transaction[];
  accounts: BankAccount[];
  goalContributions: GoalContribution[];
  loanPayments: LoanPaymentRecord[];
  credits: Credit[];
  subscriptions: Subscription[];
  goals?: Array<{ id: string; current: number; target: number }>;
  inventory?: Array<{ id: string; value: number }>;
};

function ledgerCardDebt(creditId: string, transactions: Transaction[]): number {
  return computeCreditCardDebtFromTransactions(creditId, transactions);
}

/** Doctor financeiro — detecta divergências entre movimentos e estado calculado. */
export function diagnoseFinancialState(
  state: FinancialState,
  input: FinancialDoctorInput,
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

  if (state.availableThisMonth < -0.01 && !state.warnings.some((w) => w.code === 'BUDGET_NEGATIVE')) {
    issues.push({
      code: 'BUDGET_NEGATIVE_UNWARNED',
      severity: 'warning',
      message: 'Orçamento negativo sem aviso no estado.',
    });
  }

  for (const cardState of state.creditCards) {
    const credit = input.credits.find((c) => c.id === cardState.credit.id);
    if (!credit) continue;

    const ledgerDebt = ledgerCardDebt(credit.id, input.transactions);

    if (Math.abs(ledgerDebt - cardState.debt) > 0.01) {
      issues.push({
        code: 'CARD_LEDGER_UI_MISMATCH',
        severity: 'error',
        message: `Dívida do cartão "${cardState.credit.name}" diverge do ledger.`,
        details: [`UI: ${cardState.debt}`, `Ledger: ${ledgerDebt}`],
      });
    }

    if (Math.abs(credit.outstandingBalance - ledgerDebt) > 0.01) {
      issues.push({
        code: 'CARD_STORED_BALANCE_DRIFT',
        severity: 'error',
        message: `Saldo guardado do cartão "${credit.name}" não coincide com movimentos.`,
        details: [
          `BD/outstandingBalance: ${credit.outstandingBalance}`,
          `Ledger: ${ledgerDebt}`,
        ],
      });
    }

    if (cardState.limit != null && cardState.debt > cardState.limit + 0.01) {
      issues.push({
        code: 'CARD_OVER_LIMIT',
        severity: 'error',
        message: `Cartão "${credit.name}" excede o limite.`,
        details: [`Dívida: ${cardState.debt}`, `Limite: ${cardState.limit}`],
      });
    }
  }

  const enriched = enrichAccountsWithBalances(
    input.accounts,
    input.transactions,
    input.goalContributions,
    input.loanPayments,
  );
  const goals = input.goals ?? [];
  const goalRows = goals.map((goal) => {
    const contributions = input.goalContributions.filter((c) => c.goalId === goal.id);
    return { current: calculateGoalProgress(goal, contributions).current };
  });
  const creditsForNetWorth = input.credits.map((credit) =>
    isCardCredit(credit.creditType)
      ? { ...credit, outstandingBalance: ledgerCardDebt(credit.id, input.transactions) }
      : credit,
  );
  const recomputedNet = calculateConsolidatedNetWorth({
    accounts: enriched
      .filter((a) => a.isActive)
      .map((a) => ({
        id: a.id,
        name: a.name,
        balance: a.balance ?? 0,
        currency: a.currency ?? 'EUR',
      })),
    goals: goalRows,
    inventory: input.inventory ?? [],
    credits: creditsForNetWorth,
  });

  if (Math.abs(recomputedNet.netWorth - state.netWorth.netWorth) > 0.01) {
    issues.push({
      code: 'NET_WORTH_DIVERGENCE',
      severity: 'error',
      message: 'Património líquido diverge do recálculo consolidado.',
      details: [
        `Estado: ${state.netWorth.netWorth}`,
        `Recalculado: ${recomputedNet.netWorth}`,
      ],
    });
  }

  const explainedNet = state.netWorthExplanation.result;
  if (Math.abs(state.netWorth.netWorth - explainedNet) > 0.01) {
    issues.push({
      code: 'NET_WORTH_EXPLAIN_MISMATCH',
      severity: 'warning',
      message: 'O património não coincide com a explicação.',
    });
  }

  for (const account of enriched.filter((a) => a.isActive)) {
    if ((account.balance ?? 0) < -0.01) {
      issues.push({
        code: 'NEGATIVE_ACCOUNT_BALANCE',
        severity: 'warning',
        message: `Conta "${account.name}" com saldo negativo inesperado.`,
        details: [`Saldo: ${account.balance}`],
      });
    }
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

  const orphanTxAccounts = input.transactions.filter(
    (tx) =>
      tx.accountId != null &&
      input.accounts.length > 0 &&
      !input.accounts.some((a) => a.id === tx.accountId),
  );
  if (orphanTxAccounts.length > 0) {
    issues.push({
      code: 'ORPHAN_TRANSACTION_ACCOUNTS',
      severity: 'warning',
      message: 'Movimentos referenciam contas inexistentes.',
      details: orphanTxAccounts.map((tx) => tx.id),
    });
  }

  const missingDirection = input.transactions.filter((tx) => {
    const kind = resolveTransactionKind(tx);
    if (kind === 'credit_card_purchase' || kind === 'credit_card_refund') {
      return !tx.creditId;
    }
    if (kind === 'credit_card_payment') {
      return !tx.creditId || !tx.accountId;
    }
    if (kind === 'transfer') {
      return !tx.accountId || !tx.destinationAccountId;
    }
    return !tx.accountId && !tx.creditId;
  });
  if (missingDirection.length > 0) {
    issues.push({
      code: 'TRANSACTION_MISSING_DIRECTION',
      severity: 'error',
      message: 'Movimentos sem conta ou cartão associado.',
      details: missingDirection.map((tx) => `${tx.id} (${tx.type})`),
    });
  }

  const seenIds = new Set<string>();
  const duplicateIds = input.transactions
    .map((tx) => tx.id)
    .filter((id) => {
      if (seenIds.has(id)) return true;
      seenIds.add(id);
      return false;
    });
  if (duplicateIds.length > 0) {
    issues.push({
      code: 'DUPLICATE_TRANSACTION_IDS',
      severity: 'error',
      message: 'IDs de movimento duplicados na cache.',
      details: duplicateIds,
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

  if (state.cashFlow.monthlyExpenses < 0) {
    issues.push({
      code: 'NEGATIVE_MONTHLY_EXPENSES',
      severity: 'warning',
      message: 'Despesas mensais negativas no cashflow.',
    });
  }

  if (state.projection.projectedNetWorth < state.netWorth.netWorth - 100000) {
    issues.push({
      code: 'CASHFLOW_PROJECTION_SANITY',
      severity: 'warning',
      message: 'Projeção de património com queda extrema inesperada.',
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
