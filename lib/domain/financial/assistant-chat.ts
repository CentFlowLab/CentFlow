import type { GoalContribution } from '@/lib/domain/goal-contribution.types';
import type { Credit } from '@/lib/domain/types';
import type { Transaction } from '@/lib/domain/transaction.types';

import { simulateDecision, type FinancialDecision } from './decision-simulator';
import type { FinancialCalendarResult } from './calendar';
import type { FinancialState } from './financial-state.types';
import { formatMoney, roundMoney } from './money';
import { calculateRealSavingsMargin } from './savings-margin';
import type { Recommendation } from './recommendations';
import type { CashflowProjectionResult } from './cashflow-projection';

/** Intenções suportadas — conjunto fechado. */
export type AssistantSupportedIntent =
  | 'daily_spend_limit'
  | 'can_i_buy'
  | 'when_runs_out'
  | 'debt_vs_save'
  | 'monthly_overview'
  | 'unsupported';

export const ASSISTANT_SUPPORTED_INTENTS: AssistantSupportedIntent[] = [
  'daily_spend_limit',
  'can_i_buy',
  'when_runs_out',
  'debt_vs_save',
  'monthly_overview',
];

export type AssistantIntentClassification = {
  intent: AssistantSupportedIntent;
  confidence: 'high' | 'medium' | 'low';
  params: AssistantIntentParams;
  reasoning?: string;
};

export type AssistantIntentParams = {
  amount?: number;
  category?: string;
  liabilityId?: string;
};

export type AssistantMotorSnapshot = {
  asOf: string;
  availableThisMonth: number;
  dailySafeSpend: number;
  marginReal: number;
  daysRemaining: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyNet: number;
  totalDebt: number;
  monthlyDebtPayments: number;
  goalProgress: Array<{
    id: string;
    name: string;
    remaining: number;
    percent: number;
  }>;
  firstRiskDay?: {
    date: string;
    balance: number;
    risk: string;
  };
  balanceAt30Days?: number;
  negativeCrossingDate?: string;
  debtVsSaveHint?: string;
  recommendationTitles: string[];
};

export type AssistantSimulationContext = {
  transactions: Transaction[];
  goalContributions: GoalContribution[];
  loanPayments: import('./loan-payments').LoanPaymentRecord[];
  goals?: import('@/lib/domain/assets.types').Goal[];
  prioritizeDebtAmortization: boolean;
};

export type AssistantQueryResult = {
  intent: AssistantSupportedIntent;
  supported: boolean;
  facts: Record<string, string | number | boolean | null>;
  summary: string;
  headline: string;
};

export const ASSISTANT_FAQ: Array<{ id: string; label: string; message: string }> = [
  {
    id: 'daily',
    label: 'Quanto posso gastar hoje?',
    message: 'Quanto posso gastar hoje com segurança?',
  },
  {
    id: 'buy',
    label: 'Posso fazer uma compra?',
    message: 'Posso gastar 100€ numa compra este mês?',
  },
  {
    id: 'runs-out',
    label: 'Quando fico sem margem?',
    message: 'Quando é que fico sem margem este mês?',
  },
  {
    id: 'debt',
    label: 'Dívida ou poupança?',
    message: 'Devo pagar dívida ou poupar para o objetivo?',
  },
  {
    id: 'overview',
    label: 'Como estou este mês?',
    message: 'Como estou financeiramente este mês?',
  },
];

export function buildAssistantMotorSnapshot(input: {
  state: FinancialState;
  transactions: Transaction[];
  calendar?: FinancialCalendarResult | null;
  projection?: CashflowProjectionResult | null;
  recommendations?: Recommendation[];
  asOf?: Date;
}): AssistantMotorSnapshot {
  const asOf = input.asOf ?? input.state.asOf;
  const margin = calculateRealSavingsMargin(
    input.state.availableThisMonth,
    input.transactions,
    asOf,
  );

  const debtRec = input.recommendations?.find((row) => row.ruleId === 'debt_vs_investment');

  return {
    asOf: asOf.toISOString(),
    availableThisMonth: input.state.availableThisMonth,
    dailySafeSpend: input.state.dailySafeSpend,
    marginReal: margin.cappedActionBudget,
    daysRemaining: input.state.budget.daysRemaining,
    monthlyIncome: input.state.cashFlow.monthlyIncome,
    monthlyExpenses: input.state.cashFlow.monthlyExpenses,
    monthlyNet: input.state.cashFlow.net,
    totalDebt: input.state.creditSummary.totalDebt,
    monthlyDebtPayments: input.state.creditSummary.monthlyPayments,
    goalProgress: input.state.goalProgress.map((goal) => ({
      id: goal.id,
      name: goal.name,
      remaining: goal.remaining,
      percent: goal.percent,
    })),
    firstRiskDay: input.calendar?.firstRiskDay
      ? {
          date: input.calendar.firstRiskDay.date,
          balance: input.calendar.firstRiskDay.projectedBalance,
          risk: input.calendar.firstRiskDay.risk,
        }
      : undefined,
    balanceAt30Days: input.projection?.horizonBalance,
    negativeCrossingDate: input.projection?.negativeCrossing?.date,
    debtVsSaveHint: debtRec?.explanation,
    recommendationTitles: (input.recommendations ?? []).map((row) => row.title),
  };
}

/**
 * Executa query determinística — números sempre do motor financeiro.
 * Chamado no client (testes) e replicado na Edge Function com o mesmo snapshot.
 */
export function executeAssistantQuery(
  intent: AssistantSupportedIntent,
  params: AssistantIntentParams,
  snapshot: AssistantMotorSnapshot,
  simulation?: {
    state: FinancialState;
    context: AssistantSimulationContext;
  },
): AssistantQueryResult {
  switch (intent) {
    case 'daily_spend_limit':
      return {
        intent,
        supported: true,
        facts: {
          dailySafeSpend: snapshot.dailySafeSpend,
          availableThisMonth: snapshot.availableThisMonth,
          marginReal: snapshot.marginReal,
          daysRemaining: snapshot.daysRemaining,
        },
        summary: `Margem real ${formatMoney(snapshot.marginReal)}, gasto seguro hoje ${formatMoney(snapshot.dailySafeSpend)}.`,
        headline:
          snapshot.dailySafeSpend > 0
            ? `Podes gastar até ${formatMoney(snapshot.dailySafeSpend)} hoje.`
            : 'Sem margem diária segura até ao fim do mês.',
      };

    case 'can_i_buy': {
      const amount = roundMoney(params.amount ?? 0);
      if (amount <= 0) {
        return {
          intent,
          supported: false,
          facts: { amount: null },
          summary: 'Não identifiquei um valor na pergunta.',
          headline: 'Indica quanto queres gastar (ex: 150€).',
        };
      }

      if (simulation) {
        const decision: FinancialDecision = {
          type: 'one_time_expense',
          amount,
          category: params.category ?? 'other',
        };
        const result = simulateDecision(simulation.state, decision, {
          transactions: simulation.context.transactions,
          goalContributions: simulation.context.goalContributions,
          loanPayments: simulation.context.loanPayments,
          goals: simulation.context.goals,
          prioritizeDebtAmortization: simulation.context.prioritizeDebtAmortization,
          asOf: simulation.state.asOf,
        });

        return {
          intent,
          supported: true,
          facts: {
            amount,
            marginBefore: result.marginBefore,
            marginAfter: result.marginAfter,
            balanceAt30DaysBefore: result.balanceAt30DaysBefore,
            balanceAt30DaysAfter: result.balanceAt30DaysAfter,
            goesNegativeThisMonth: result.goesNegativeThisMonth,
            canProceed: result.canProceedWithoutRisk,
            topGoalDelayDays: result.goalImpacts[0]?.daysDelayed ?? 0,
          },
          summary: result.recommendation,
          headline: result.headline,
        };
      }

      const marginAfter = roundMoney(snapshot.marginReal - amount);
      return {
        intent,
        supported: true,
        facts: {
          amount,
          marginBefore: snapshot.marginReal,
          marginAfter,
          goesNegativeThisMonth: marginAfter < 0,
        },
        summary: `Margem após ${formatMoney(amount)}: ${formatMoney(marginAfter)}.`,
        headline:
          marginAfter > 0
            ? `Com ${formatMoney(amount)}, ainda tens ${formatMoney(marginAfter)} de margem real.`
            : `Com ${formatMoney(amount)}, ficas sem margem real este mês.`,
      };
    }

    case 'when_runs_out':
      return {
        intent,
        supported: true,
        facts: {
          marginReal: snapshot.marginReal,
          daysRemaining: snapshot.daysRemaining,
          firstRiskDate: snapshot.firstRiskDay?.date ?? null,
          firstRiskBalance: snapshot.firstRiskDay?.balance ?? null,
          negativeCrossingDate: snapshot.negativeCrossingDate ?? null,
        },
        summary: snapshot.firstRiskDay
          ? `Primeiro dia de risco: ${snapshot.firstRiskDay.date} (saldo ${formatMoney(snapshot.firstRiskDay.balance)}).`
          : `Margem real actual: ${formatMoney(snapshot.marginReal)} em ${snapshot.daysRemaining} dias.`,
        headline: snapshot.firstRiskDay
          ? `O saldo projetado fica negativo a ${snapshot.firstRiskDay.date.slice(8, 10)}/${snapshot.firstRiskDay.date.slice(5, 7)}.`
          : snapshot.negativeCrossingDate
            ? `Saldo negativo previsto a ${snapshot.negativeCrossingDate}.`
            : snapshot.marginReal <= 0
              ? 'Já estás sem margem real este mês.'
              : 'Não há dia de risco projectado nos próximos 30 dias.',
      };

    case 'debt_vs_save':
      return {
        intent,
        supported: true,
        facts: {
          totalDebt: snapshot.totalDebt,
          monthlyDebtPayments: snapshot.monthlyDebtPayments,
          marginReal: snapshot.marginReal,
          hasDebtRecommendation: Boolean(snapshot.debtVsSaveHint),
        },
        summary:
          snapshot.debtVsSaveHint ??
          (snapshot.totalDebt > 0
            ? `Dívida total ${formatMoney(snapshot.totalDebt)}, mensalidades ${formatMoney(snapshot.monthlyDebtPayments)}.`
            : 'Sem dívida activa registada.'),
        headline:
          snapshot.debtVsSaveHint ??
          (snapshot.marginReal > 200 && snapshot.totalDebt > 0
            ? 'Com margem disponível, amortizar dívida costuma poupar juros.'
            : snapshot.marginReal <= 0
              ? 'Primeiro garante margem para o mês — não há excedente para amortizar.'
              : 'Sem recomendação específica de dívida vs poupança neste momento.'),
      };

    case 'monthly_overview':
      return {
        intent,
        supported: true,
        facts: {
          availableThisMonth: snapshot.availableThisMonth,
          marginReal: snapshot.marginReal,
          monthlyIncome: snapshot.monthlyIncome,
          monthlyExpenses: snapshot.monthlyExpenses,
          monthlyNet: snapshot.monthlyNet,
          balanceAt30Days: snapshot.balanceAt30Days ?? null,
        },
        summary: `Receitas ${formatMoney(snapshot.monthlyIncome)}, despesas ${formatMoney(snapshot.monthlyExpenses)}, margem real ${formatMoney(snapshot.marginReal)}.`,
        headline:
          snapshot.monthlyNet >= 0
            ? `Este mês estás positivo em ${formatMoney(snapshot.monthlyNet)} (fluxo líquido).`
            : `Este mês estás negativo em ${formatMoney(Math.abs(snapshot.monthlyNet))} no fluxo do mês.`,
      };

    default:
      return {
        intent: 'unsupported',
        supported: false,
        facts: {},
        summary: 'Pergunta fora do âmbito actual do assistente.',
        headline: 'Ainda não sei responder a esse tipo de pergunta.',
      };
  }
}

export function parseAssistantIntentFromClassification(raw: {
  intent?: string;
  confidence?: string;
  amount?: number | null;
  category?: string | null;
  reasoning?: string;
}): AssistantIntentClassification {
  const intent = ASSISTANT_SUPPORTED_INTENTS.includes(raw.intent as AssistantSupportedIntent)
    ? (raw.intent as AssistantSupportedIntent)
    : 'unsupported';

  return {
    intent,
    confidence:
      raw.confidence === 'high' || raw.confidence === 'medium' || raw.confidence === 'low'
        ? raw.confidence
        : 'low',
    params: {
      amount: typeof raw.amount === 'number' && raw.amount > 0 ? raw.amount : undefined,
      category: raw.category ?? undefined,
    },
    reasoning: raw.reasoning,
  };
}
