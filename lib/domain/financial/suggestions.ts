import type { BankAccount } from '@/lib/domain/account.types';
import type { Credit } from '@/lib/domain/types';
import type { Suggestion } from '@/lib/domain/types';

import { simulateEarlyAmortization, resolveEffectiveAnnualRate } from '@/lib/credit/credit-analysis';
import { isCardCredit } from '@/lib/credit/credit-type.utils';

import { addMoney, formatMoney, roundMoney } from './money';

/** Rendimento anual assumido para contas de investimento sem taxa registada. */
export const DEFAULT_INVESTMENT_RETURN_PERCENT = 5;

/** Percentagens de cenário — nunca sugerir 100% do disponível. */
export const AMORTIZATION_SCENARIO_PERCENTS = [10, 20, 30] as const;

/** Tecto do pool de referência (% do menor entre investimento e disponível mensal). */
export const MAX_SUGGESTION_POOL_FRACTION = 0.9;

export const FINANCIAL_SUGGESTION_DISCLAIMER =
  'Sugestão baseada nos teus dados registados — não constitui aconselhamento financeiro.';

export type FinancialSuggestionScenario = {
  percent: number;
  amount: number;
  interestSaved: number;
  monthsSaved: number;
};

export type FinancialSuggestion = {
  id: string;
  title: string;
  reason: string;
  dataUsed: string[];
  scenarios: FinancialSuggestionScenario[];
  disclaimer: string;
  type: Suggestion['type'];
  actionLabel?: string;
  ctaRoute?: string;
  priority: number;
};

export type BuildFinancialSuggestionsInput = {
  accounts: BankAccount[];
  credits: Credit[];
  /** Disponível este mês (contas budget_enabled − obrigações). */
  monthlyAvailable: number;
  /** Rendimento anual (%) por conta de investimento — chave = account.id. */
  investmentReturnByAccountId?: Record<string, number>;
};

type InvestmentPosition = {
  id: string;
  name: string;
  balance: number;
  expectedReturnAnnualPercent: number;
};

type LoanCandidate = {
  credit: Credit;
  taeg: number;
  monthlyPayment: number;
};

function collectInvestmentPositions(input: BuildFinancialSuggestionsInput): InvestmentPosition[] {
  const overrides = input.investmentReturnByAccountId ?? {};

  return input.accounts
    .filter((account) => account.isActive && account.type === 'investment')
    .map((account) => {
      const balance = roundMoney(account.balance ?? account.initialBalance);
      const expectedReturnAnnualPercent =
        overrides[account.id] ?? DEFAULT_INVESTMENT_RETURN_PERCENT;
      return {
        id: account.id,
        name: account.name,
        balance,
        expectedReturnAnnualPercent,
      };
    })
    .filter((position) => position.balance > 0);
}

function collectLoanCandidates(credits: Credit[]): LoanCandidate[] {
  return credits
    .filter((credit) => !isCardCredit(credit.creditType))
    .filter((credit) => credit.outstandingBalance > 0)
    .map((credit) => {
      const taeg = resolveEffectiveAnnualRate({
        outstandingBalance: credit.outstandingBalance,
        interestRateAnnual: credit.interestRateAnnual,
        indexRate: credit.indexRate,
        spread: credit.spread,
        termMonths: credit.termMonths,
        monthlyPayment: credit.monthlyPayment,
        nextPaymentAmount: credit.nextPaymentAmount,
      });
      const monthlyPayment =
        credit.monthlyPayment ?? credit.nextPaymentAmount ?? 0;
      return { credit, taeg, monthlyPayment };
    })
    .filter((row) => row.taeg > 0 && row.monthlyPayment > 0);
}

function buildScenarioPool(
  investmentTotal: number,
  monthlyAvailable: number,
): number {
  if (investmentTotal <= 0 || monthlyAvailable <= 0) return 0;
  const cappedAvailable = roundMoney(monthlyAvailable * MAX_SUGGESTION_POOL_FRACTION);
  return roundMoney(Math.min(investmentTotal, cappedAvailable));
}

function buildAmortizationScenarios(
  balance: number,
  monthlyPayment: number,
  taeg: number,
  pool: number,
): FinancialSuggestionScenario[] {
  const scenarios: FinancialSuggestionScenario[] = [];

  for (const percent of AMORTIZATION_SCENARIO_PERCENTS) {
    const amount = roundMoney(pool * (percent / 100));
    if (amount <= 0) continue;

    const simulation = simulateEarlyAmortization(
      balance,
      monthlyPayment,
      taeg,
      amount,
    );
    if (!simulation || simulation.interestSaved <= 0) continue;

    scenarios.push({
      percent,
      amount,
      interestSaved: roundMoney(simulation.interestSaved),
      monthsSaved: simulation.monthsSaved,
    });
  }

  return scenarios;
}

function formatScenariosLine(scenarios: FinancialSuggestionScenario[]): string {
  if (scenarios.length === 0) return '';
  return scenarios
    .map(
      (scenario) =>
        `${scenario.percent}% (${formatMoney(scenario.amount)}): ~${formatMoney(scenario.interestSaved)} menos juros`,
    )
    .join(' · ');
}

/**
 * Motor de sugestões financeiras — regras determinísticas sobre dados reais.
 * Sem IA externa; cada sugestão inclui motivo, dados usados e cenários parciais.
 */
export function buildFinancialSuggestions(
  input: BuildFinancialSuggestionsInput,
): FinancialSuggestion[] {
  const suggestions: FinancialSuggestion[] = [];
  const investments = collectInvestmentPositions(input);
  const loans = collectLoanCandidates(input.credits);

  const investmentTotal = roundMoney(
    investments.reduce((sum, row) => addMoney(sum, row.balance), 0),
  );
  const investmentReturn =
    investments.length > 0
      ? roundMoney(
          investments.reduce(
            (sum, row) => sum + row.balance * row.expectedReturnAnnualPercent,
            0,
          ) / investmentTotal,
        )
      : 0;

  const scenarioPool = buildScenarioPool(investmentTotal, input.monthlyAvailable);

  for (const loan of loans) {
    if (loan.taeg <= investmentReturn || scenarioPool <= 0) continue;

    const primaryInvestment = investments.reduce((best, current) =>
      current.balance > best.balance ? current : best,
    );

    const scenarios = buildAmortizationScenarios(
      loan.credit.outstandingBalance,
      loan.monthlyPayment,
      loan.taeg,
      scenarioPool,
    );
    if (scenarios.length === 0) continue;

    const dataUsed = [
      `${primaryInvestment.name}: ${formatMoney(primaryInvestment.balance)} (${primaryInvestment.expectedReturnAnnualPercent.toFixed(2)}% a.a. estimado)`,
      `${loan.credit.name}: TAEG ${loan.taeg.toFixed(2)}%, saldo ${formatMoney(loan.credit.outstandingBalance)}`,
      `Disponível este mês: ${formatMoney(input.monthlyAvailable)}`,
      `Cenários até ${formatMoney(scenarioPool)} (máx. 90% do pool investimento/disponível)`,
    ];

    suggestions.push({
      id: `fin-amort-${loan.credit.id}`,
      title: 'Avaliar amortização parcial do crédito',
      reason: `O crédito "${loan.credit.name}" (${loan.taeg.toFixed(2)}% TAEG) custa mais do que o rendimento estimado dos teus investimentos (${investmentReturn.toFixed(2)}% a.a.).`,
      dataUsed,
      scenarios,
      disclaimer: FINANCIAL_SUGGESTION_DISCLAIMER,
      type: 'investment',
      actionLabel: 'Ver créditos',
      ctaRoute: '/(tabs)/precos',
      priority: 100,
    });
  }

  if (input.monthlyAvailable < 0) {
    suggestions.push({
      id: 'fin-negative-budget',
      title: 'Orçamento mensal negativo',
      reason: `O disponível deste mês (${formatMoney(input.monthlyAvailable)}) está abaixo de zero após obrigações futuras.`,
      dataUsed: [`Disponível: ${formatMoney(input.monthlyAvailable)}`],
      scenarios: [],
      disclaimer: FINANCIAL_SUGGESTION_DISCLAIMER,
      type: 'savings',
      actionLabel: 'Ver detalhes',
      ctaRoute: '/(tabs)/index',
      priority: 90,
    });
  }

  for (const loan of loans) {
    if (loan.taeg < 8 || suggestions.some((s) => s.id === `fin-amort-${loan.credit.id}`)) {
      continue;
    }
    suggestions.push({
      id: `fin-high-taeg-${loan.credit.id}`,
      title: 'TAEG elevado no crédito',
      reason: `"${loan.credit.name}" tem TAEG ${loan.taeg.toFixed(2)}% — acima do limiar de 8% usado pela app para alertas.`,
      dataUsed: [
        `Saldo: ${formatMoney(loan.credit.outstandingBalance)}`,
        `TAEG: ${loan.taeg.toFixed(2)}%`,
      ],
      scenarios: [],
      disclaimer: FINANCIAL_SUGGESTION_DISCLAIMER,
      type: 'general',
      actionLabel: 'Simular crédito',
      ctaRoute: '/(tabs)/precos',
      priority: 50,
    });
  }

  return suggestions.sort((a, b) => b.priority - a.priority);
}

export function mapFinancialSuggestionsToHome(
  items: FinancialSuggestion[],
): Suggestion[] {
  return items.map((item) => {
    const scenarioLine = formatScenariosLine(item.scenarios);
    const dataLine = item.dataUsed.join(' · ');
    const description = [
      item.reason,
      dataLine,
      scenarioLine,
      item.disclaimer,
    ]
      .filter(Boolean)
      .join('\n\n');

    return {
      id: item.id,
      title: item.title,
      description,
      actionLabel: item.actionLabel,
      type: item.type,
      ctaRoute: item.ctaRoute,
    };
  });
}
