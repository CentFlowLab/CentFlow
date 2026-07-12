import type { Subscription } from '@/lib/domain/assets.types';
import type { GoalContribution } from '@/lib/domain/goal-contribution.types';
import type { Credit } from '@/lib/domain/types';
import type { Transaction } from '@/lib/domain/transaction.types';

import { isCardCredit } from '@/lib/credit/credit-type.utils';

import { getPreviousCompleteMonthKeys } from './category-budgets';
import { buildDebtAmortizationAction } from './debt-amortization-action';
import {
  getMonthKey,
  startOfDay,
} from './dates';
import {
  advanceCreditPaymentDate,
  sumLoanPaymentsInMonth,
  type LoanPaymentRecord,
} from './loan-payments';
import { roundMoney } from './money';
import {
  advanceSubscriptionRenewalDate,
  collectPaidSubscriptionIds,
} from './subscription-payments';
import {
  calculateRealSavingsMargin,
  calculateRemainingVariableProjection,
  calculateVariableSpendMonthlyMedian,
} from './savings-margin';
import { getIncomeTotal, sumGlobalCashBalance } from './transactions';

export type CashflowProjectionHorizon = 30 | 60 | 90;

export const CASHFLOW_PROJECTION_HORIZONS: CashflowProjectionHorizon[] = [30, 60, 90];

export type CashflowScheduledEventKind =
  | 'income'
  | 'credit_payment'
  | 'subscription'
  | 'recurring_expense';

export type CashflowScheduledEvent = {
  id: string;
  date: string;
  amount: number;
  direction: 'inflow' | 'outflow';
  kind: CashflowScheduledEventKind;
  label: string;
  sourceId?: string;
  /** Incluído na projeção de saldo (vs. apenas informativo). */
  affectsProjection: boolean;
  isConfirmed: boolean;
};

export type CashflowProjectionPoint = {
  date: string;
  dayIndex: number;
  balance: number;
};

export type CashflowNegativeCrossing = {
  date: string;
  dayIndex: number;
  balance: number;
};

export type CashflowProjectionResult = {
  horizon: CashflowProjectionHorizon;
  points: CashflowProjectionPoint[];
  currentBalance: number;
  variableMedianMonthly: number;
  incomeMedianMonthly: number;
  horizonBalance: number;
  horizonDate: string;
  negativeCrossing?: CashflowNegativeCrossing;
  hasEnoughHistory: boolean;
};

export type BuildCashflowProjectionInput = {
  transactions: Transaction[];
  subscriptions: Subscription[];
  credits: Credit[];
  goalContributions: GoalContribution[];
  loanPayments: LoanPaymentRecord[];
  prioritizeDebtAmortization: boolean;
  horizon: CashflowProjectionHorizon;
  asOf?: Date;
};

type CashflowEventMap = Map<string, number>;

type ScheduleResult = {
  deltas: CashflowEventMap;
  events: CashflowScheduledEvent[];
};

function pushEvent(events: CashflowScheduledEvent[], event: CashflowScheduledEvent): void {
  events.push(event);
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return roundMoney(sorted[mid]);
  return roundMoney((sorted[mid - 1] + sorted[mid]) / 2);
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return startOfDay(next);
}

function isLastDayOfMonth(date: Date): boolean {
  const next = new Date(date);
  next.setDate(date.getDate() + 1);
  return date.getMonth() !== next.getMonth();
}

/** Mediana de receitas nos últimos 3 meses civis completos (≥2 meses com receita). */
export function calculateMonthlyIncomeMedian(
  transactions: Transaction[],
  asOf: Date = new Date(),
): number {
  const monthKeys = getPreviousCompleteMonthKeys(3, asOf);
  const monthlyTotals = monthKeys.map((monthKey) =>
    getIncomeTotal(transactions, { kind: 'month', monthKey, asOf }),
  );
  const monthsWithIncome = monthlyTotals.filter((amount) => amount > 0);
  if (monthsWithIncome.length < 2) return 0;
  return median(monthlyTotals);
}

function addEvent(events: CashflowEventMap, dateIso: string, delta: number): void {
  if (delta === 0) return;
  events.set(dateIso, roundMoney((events.get(dateIso) ?? 0) + delta));
}

function scheduleSubscriptionPayments(
  subscriptions: Subscription[],
  transactions: Transaction[],
  asOf: Date,
  horizonEnd: Date,
): ScheduleResult {
  const events: CashflowEventMap = new Map();
  const details: CashflowScheduledEvent[] = [];
  const asOfIso = toIsoDate(asOf);
  const horizonIso = toIsoDate(horizonEnd);
  const paidIds = collectPaidSubscriptionIds(subscriptions, transactions, asOf);

  for (const subscription of subscriptions) {
    if (subscription.amount <= 0) continue;

    let dueIso = subscription.renewsAt?.slice(0, 10) ?? toIsoDate(asOf);

    if (paidIds.has(subscription.id)) {
      dueIso = advanceSubscriptionRenewalDate(subscription, asOfIso);
    }

    let guard = 0;
    while (dueIso <= horizonIso && guard < 48) {
      guard += 1;
      if (dueIso > asOfIso) {
        addEvent(events, dueIso, -subscription.amount);
        pushEvent(details, {
          id: `sub-${subscription.id}-${dueIso}`,
          date: dueIso,
          amount: subscription.amount,
          direction: 'outflow',
          kind: 'subscription',
          label: subscription.name,
          sourceId: subscription.id,
          affectsProjection: true,
          isConfirmed: true,
        });
      }
      dueIso = advanceSubscriptionRenewalDate(
        {
          renewsAt: dueIso,
          billingInterval: subscription.billingInterval ?? 'monthly',
        },
        dueIso,
      );
    }
  }

  return { deltas: events, events: details };
}

function scheduleCreditInstallments(
  credits: Credit[],
  loanPayments: LoanPaymentRecord[],
  asOf: Date,
  horizonEnd: Date,
): ScheduleResult {
  const events: CashflowEventMap = new Map();
  const details: CashflowScheduledEvent[] = [];
  const asOfIso = toIsoDate(asOf);
  const horizonIso = toIsoDate(horizonEnd);
  const monthKey = getMonthKey(asOf);
  const { paidCreditIds } = sumLoanPaymentsInMonth(loanPayments, monthKey);

  for (const credit of credits) {
    if (isCardCredit(credit.creditType)) continue;

    const amount = credit.nextPaymentAmount ?? credit.monthlyPayment ?? 0;
    if (amount <= 0) continue;

    let dueIso = credit.nextPaymentDate?.slice(0, 10);
    if (!dueIso) continue;

    if (paidCreditIds.has(credit.id)) {
      const advanced = advanceCreditPaymentDate(credit, asOfIso);
      if (!advanced) continue;
      dueIso = advanced;
    }

    let guard = 0;
    while (dueIso <= horizonIso && guard < 48) {
      guard += 1;
      if (dueIso > asOfIso) {
        addEvent(events, dueIso, -amount);
        pushEvent(details, {
          id: `credit-${credit.id}-${dueIso}`,
          date: dueIso,
          amount,
          direction: 'outflow',
          kind: 'credit_payment',
          label: credit.name,
          sourceId: credit.id,
          affectsProjection: true,
          isConfirmed: true,
        });
      }
      const advanced = advanceCreditPaymentDate({ nextPaymentDate: dueIso }, dueIso);
      if (!advanced) break;
      dueIso = advanced;
    }
  }

  return { deltas: events, events: details };
}

function scheduleRecurringIncome(
  transactions: Transaction[],
  incomeMedianMonthly: number,
  asOf: Date,
  horizonEnd: Date,
): ScheduleResult {
  const events: CashflowEventMap = new Map();
  const details: CashflowScheduledEvent[] = [];
  if (incomeMedianMonthly <= 0) return { deltas: events, events: details };

  const asOfIso = toIsoDate(asOf);
  const horizonIso = toIsoDate(horizonEnd);
  const currentMonthKey = getMonthKey(asOf);
  const incomeReceived = getIncomeTotal(transactions, {
    kind: 'month',
    monthKey: currentMonthKey,
    asOf,
  });
  const remainingThisMonth = roundMoney(Math.max(0, incomeMedianMonthly - incomeReceived));

  if (remainingThisMonth > 0) {
    const nextDay = toIsoDate(addDays(asOf, 1));
    if (nextDay <= horizonIso) {
      addEvent(events, nextDay, remainingThisMonth);
      pushEvent(details, {
        id: `income-remainder-${nextDay}`,
        date: nextDay,
        amount: remainingThisMonth,
        direction: 'inflow',
        kind: 'income',
        label: 'Rendimento estimado (restante do mês)',
        affectsProjection: true,
        isConfirmed: false,
      });
    }
  }

  let cursor = new Date(asOf.getFullYear(), asOf.getMonth() + 1, 1, 12, 0, 0, 0);
  while (toIsoDate(cursor) <= horizonIso) {
    const cursorIso = toIsoDate(cursor);
    if (cursorIso > asOfIso) {
      addEvent(events, cursorIso, incomeMedianMonthly);
      pushEvent(details, {
        id: `income-monthly-${cursorIso}`,
        date: cursorIso,
        amount: incomeMedianMonthly,
        direction: 'inflow',
        kind: 'income',
        label: 'Rendimento mensal estimado',
        affectsProjection: true,
        isConfirmed: false,
      });
    }
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1, 12, 0, 0, 0);
  }

  return { deltas: events, events: details };
}

function mergeEventMaps(...maps: CashflowEventMap[]): CashflowEventMap {
  const merged: CashflowEventMap = new Map();
  for (const map of maps) {
    for (const [date, delta] of map.entries()) {
      addEvent(merged, date, delta);
    }
  }
  return merged;
}

function getDailyVariableSpend(
  date: Date,
  asOf: Date,
  medianMonthly: number,
): number {
  if (medianMonthly <= 0) return 0;

  const dateIso = toIsoDate(date);
  const asOfIso = toIsoDate(asOf);
  if (dateIso <= asOfIso) return 0;

  const asOfMonth = getMonthKey(asOf);
  const dateMonth = getMonthKey(date);

  if (dateMonth === asOfMonth) {
    const { daysRemaining, projection } = calculateRemainingVariableProjection(medianMonthly, asOf);
    if (daysRemaining <= 0) return 0;
    return roundMoney(projection / daysRemaining);
  }

  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return roundMoney(medianMonthly / daysInMonth);
}

function applyMonthEndDebtAmortization(
  balance: number,
  credits: Credit[],
  transactions: Transaction[],
  monthEndDate: Date,
  prioritizeDebt: boolean,
): { balance: number; credits: Credit[] } {
  if (!prioritizeDebt || balance <= 0) {
    return { balance, credits };
  }

  const margin = calculateRealSavingsMargin(balance, transactions, monthEndDate);
  const action = buildDebtAmortizationAction({
    margin,
    credits,
    prioritizeDebt: true,
  });

  if (!action) {
    return { balance, credits };
  }

  const nextBalance = roundMoney(balance - action.amount);
  const nextCredits = credits.map((credit) =>
    credit.id === action.creditId
      ? {
          ...credit,
          outstandingBalance: roundMoney(Math.max(0, credit.outstandingBalance - action.amount)),
        }
      : credit,
  );

  return { balance: nextBalance, credits: nextCredits };
}

function findNegativeCrossing(
  points: CashflowProjectionPoint[],
): CashflowNegativeCrossing | undefined {
  for (const point of points) {
    if (point.balance < 0) {
      return {
        date: point.date,
        dayIndex: point.dayIndex,
        balance: point.balance,
      };
    }
  }
  return undefined;
}

/** Eventos agendados usados pela projeção de cashflow (e pelo calendário financeiro). */
export function buildCashflowScheduledEvents(
  input: BuildCashflowProjectionInput,
): CashflowScheduledEvent[] {
  const asOf = startOfDay(input.asOf ?? new Date());
  const horizonEnd = addDays(asOf, input.horizon);
  const incomeMedianMonthly = calculateMonthlyIncomeMedian(input.transactions, asOf);

  const subscriptionSchedule = scheduleSubscriptionPayments(
    input.subscriptions,
    input.transactions,
    asOf,
    horizonEnd,
  );
  const creditSchedule = scheduleCreditInstallments(
    input.credits,
    input.loanPayments,
    asOf,
    horizonEnd,
  );
  const incomeSchedule = scheduleRecurringIncome(
    input.transactions,
    incomeMedianMonthly,
    asOf,
    horizonEnd,
  );

  return [
    ...subscriptionSchedule.events,
    ...creditSchedule.events,
    ...incomeSchedule.events,
  ];
}

/** Projeção diária de saldo de caixa para 30/60/90 dias. */
export function buildCashflowProjection(
  input: BuildCashflowProjectionInput,
): CashflowProjectionResult {
  const asOf = startOfDay(input.asOf ?? new Date());
  const horizon = input.horizon;
  const horizonEnd = addDays(asOf, horizon);

  const variable = calculateVariableSpendMonthlyMedian(input.transactions, asOf);
  const incomeMedianMonthly = calculateMonthlyIncomeMedian(input.transactions, asOf);

  const currentBalance = sumGlobalCashBalance(input.transactions, {
    goalContributions: input.goalContributions,
    loanPayments: input.loanPayments,
    scope: 'occurred',
    asOf,
  });

  const subscriptionSchedule = scheduleSubscriptionPayments(
    input.subscriptions,
    input.transactions,
    asOf,
    horizonEnd,
  );
  const creditSchedule = scheduleCreditInstallments(
    input.credits,
    input.loanPayments,
    asOf,
    horizonEnd,
  );
  const incomeSchedule = scheduleRecurringIncome(
    input.transactions,
    incomeMedianMonthly,
    asOf,
    horizonEnd,
  );

  const events = mergeEventMaps(
    subscriptionSchedule.deltas,
    creditSchedule.deltas,
    incomeSchedule.deltas,
  );

  const points: CashflowProjectionPoint[] = [
    {
      date: toIsoDate(asOf),
      dayIndex: 0,
      balance: currentBalance,
    },
  ];

  let balance = currentBalance;
  let creditsState = input.credits.map((credit) => ({ ...credit }));

  for (let dayIndex = 1; dayIndex <= horizon; dayIndex += 1) {
    const date = addDays(asOf, dayIndex);
    const dateIso = toIsoDate(date);

    balance = roundMoney(balance - getDailyVariableSpend(date, asOf, variable.medianMonthly));

    const eventDelta = events.get(dateIso) ?? 0;
    balance = roundMoney(balance + eventDelta);

    if (isLastDayOfMonth(date)) {
      const amortized = applyMonthEndDebtAmortization(
        balance,
        creditsState,
        input.transactions,
        date,
        input.prioritizeDebtAmortization,
      );
      balance = amortized.balance;
      creditsState = amortized.credits;
    }

    points.push({
      date: dateIso,
      dayIndex,
      balance,
    });
  }

  const horizonPoint = points[points.length - 1];

  return {
    horizon,
    points,
    currentBalance,
    variableMedianMonthly: variable.medianMonthly,
    incomeMedianMonthly,
    horizonBalance: horizonPoint.balance,
    horizonDate: horizonPoint.date,
    negativeCrossing: findNegativeCrossing(points.slice(1)),
    hasEnoughHistory: variable.monthsUsed >= 2,
  };
}
