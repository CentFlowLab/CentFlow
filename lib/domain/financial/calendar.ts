import type { Subscription, SubscriptionBillingInterval } from '@/lib/domain/assets.types';
import type { GoalContribution } from '@/lib/domain/goal-contribution.types';
import type { Credit } from '@/lib/domain/types';
import type { Transaction } from '@/lib/domain/transaction.types';

import { nextOccurrenceOfDayIso } from '@/lib/credit/credit-dates';
import type { DetectedSubscription } from '@/lib/subscriptions/detect-subscriptions';
import { detectSubscriptionsFromTransactions } from '@/lib/subscriptions/detect-subscriptions';
import type { DetectedRecurringIncome } from '@/lib/subscriptions/detect-recurring-income';
import { detectRecurringIncomeFromTransactions } from '@/lib/subscriptions/detect-recurring-income';

import {
  advanceSubscriptionRenewalDate,
} from './subscription-payments';
import {
  buildCashflowProjection,
  buildCashflowScheduledEvents,
  type CashflowProjectionHorizon,
  type CashflowScheduledEvent,
} from './cashflow-projection';
import type { FinancialState } from './financial-state.types';
import { getMonthKey, startOfDay } from './dates';
import { roundMoney } from './money';
import { resolveTransactionKind } from './transaction-kind';
import { buildSpendingCalendar, type SpendingDayCell } from './spending-calendar';
import type { LoanPaymentRecord } from './loan-payments';

export type FinancialCalendarDayKind =
  | 'income'
  | 'expense'
  | 'transfer'
  | 'subscription'
  | 'credit_payment'
  | 'card_purchase'
  | 'card_payment'
  | 'goal'
  | 'investment'
  | 'recurring_expense';

export type FinancialCalendarDayRisk = 'neutral' | 'attention' | 'risk';

export type FinancialCalendarEvent = CashflowScheduledEvent & {
  note?: string;
};

export type FinancialCalendarProjectionDay = {
  date: string;
  dayIndex: number;
  projectedBalance: number;
  risk: FinancialCalendarDayRisk;
  events: FinancialCalendarEvent[];
  outflowTotal: number;
  inflowTotal: number;
  nextIncomeDate?: string;
  problemStartsOn?: string;
};

export type FinancialCalendarResult = {
  days: FinancialCalendarProjectionDay[];
  horizonDays: number;
  projectionHorizon: CashflowProjectionHorizon;
  asOf: Date;
  incomePatternDetected: boolean;
  incomePatternNote?: string;
  detectedIncome: DetectedRecurringIncome[];
  riskDays: FinancialCalendarProjectionDay[];
  firstRiskDay?: FinancialCalendarProjectionDay;
  lowBalanceThreshold: number;
};

export type BuildFinancialCalendarContext = {
  transactions: Transaction[];
  subscriptions: Subscription[];
  credits: Credit[];
  goalContributions?: GoalContribution[];
  loanPayments?: LoanPaymentRecord[];
  dismissedSubscriptionIds?: string[];
  prioritizeDebtAmortization?: boolean;
  asOf?: Date;
};

/** Timeline mensal histórica (gastos do mês corrente). */
export type MonthlySpendingCalendarDay = SpendingDayCell & {
  income: number;
  transfers: number;
  cardPurchases: number;
  cardPayments: number;
  kinds: FinancialCalendarDayKind[];
};

function classifyDayKinds(transactions: Transaction[]): FinancialCalendarDayKind[] {
  const kinds = new Set<FinancialCalendarDayKind>();
  for (const tx of transactions) {
    const kind = resolveTransactionKind(tx);
    switch (kind) {
      case 'income':
        kinds.add('income');
        break;
      case 'expense':
        kinds.add('expense');
        break;
      case 'transfer':
        kinds.add('transfer');
        break;
      case 'credit_card_purchase':
        kinds.add('card_purchase');
        break;
      case 'credit_card_payment':
        kinds.add('card_payment');
        break;
      default:
        break;
    }
  }
  return [...kinds];
}

/** Calendário de gastos do mês corrente (histórico). */
export function buildMonthlySpendingTimeline(
  transactions: Transaction[],
  asOf: Date = new Date(),
): MonthlySpendingCalendarDay[] {
  const monthKey = getMonthKey(asOf);
  const spendingCells = buildSpendingCalendar(transactions, monthKey, asOf);
  const byDay = new Map<string, Transaction[]>();

  for (const tx of transactions) {
    if (!tx.date.startsWith(monthKey)) continue;
    const key = tx.date.slice(0, 10);
    const bucket = byDay.get(key) ?? [];
    bucket.push(tx);
    byDay.set(key, bucket);
  }

  return spendingCells.map((cell) => {
    const dayTxs = byDay.get(cell.dayKey) ?? [];
    let income = 0;
    let transfers = 0;
    let cardPurchases = 0;
    let cardPayments = 0;

    for (const tx of dayTxs) {
      const kind = resolveTransactionKind(tx);
      switch (kind) {
        case 'income':
          income += tx.amount;
          break;
        case 'transfer':
          transfers += tx.amount;
          break;
        case 'credit_card_purchase':
          cardPurchases += tx.amount;
          break;
        case 'credit_card_payment':
          cardPayments += tx.amount;
          break;
        default:
          break;
      }
    }

    return {
      ...cell,
      income,
      transfers,
      cardPurchases,
      cardPayments,
      kinds: classifyDayKinds(dayTxs),
    };
  });
}

/** @deprecated Usar buildMonthlySpendingTimeline */
export const buildFinancialCalendarLegacy = buildMonthlySpendingTimeline;

function resolveProjectionHorizon(days: number): CashflowProjectionHorizon {
  if (days <= 30) return 30;
  if (days <= 60) return 60;
  return 90;
}

function clampHorizonDays(days: number): number {
  return Math.max(1, Math.min(90, Math.round(days)));
}

function scheduleDetectedSubscriptions(
  detected: DetectedSubscription[],
  asOf: Date,
  horizonEndIso: string,
): FinancialCalendarEvent[] {
  const asOfIso = toIsoDate(asOf);
  const events: FinancialCalendarEvent[] = [];

  for (const item of detected) {
    let dueIso = item.lastDate.slice(0, 10);
    if (dueIso <= asOfIso) {
      dueIso = advanceSubscriptionRenewalDate(
        { renewsAt: dueIso, billingInterval: item.billingInterval },
        dueIso,
      );
    }

    let guard = 0;
    while (dueIso <= horizonEndIso && guard < 24) {
      guard += 1;
      if (dueIso > asOfIso) {
        events.push({
          id: `detected-sub-${item.id}-${dueIso}`,
          date: dueIso,
          amount: item.amount,
          direction: 'outflow',
          kind: 'recurring_expense',
          label: item.name,
          sourceId: item.id,
          affectsProjection: false,
          isConfirmed: false,
          note: 'Recorrência detetada — ainda não confirmada',
        });
      }
      dueIso = advanceSubscriptionRenewalDate(
        { renewsAt: dueIso, billingInterval: item.billingInterval },
        dueIso,
      );
    }
  }

  return events;
}

function scheduleDetectedIncome(
  detected: DetectedRecurringIncome[],
  asOf: Date,
  horizonEndIso: string,
): FinancialCalendarEvent[] {
  const events: FinancialCalendarEvent[] = [];

  for (const item of detected) {
    let dueIso = nextOccurrenceOfDayIso(item.typicalDayOfMonth, asOf);
    let guard = 0;
    while (dueIso <= horizonEndIso && guard < 24) {
      guard += 1;
      events.push({
        id: `detected-income-${item.id}-${dueIso}`,
        date: dueIso,
        amount: item.amount,
        direction: 'inflow',
        kind: 'income',
        label: item.name,
        sourceId: item.id,
        affectsProjection: false,
        isConfirmed: item.confidence === 'high',
        note:
          item.confidence === 'high'
            ? 'Padrão de rendimento detetado'
            : 'Padrão de rendimento provável',
      });
      dueIso = advanceIncomeDate(dueIso, item.billingInterval);
    }
  }

  return events;
}

function advanceIncomeDate(iso: string, interval: SubscriptionBillingInterval): string {
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) return iso;
  if (interval === 'annual') {
    return `${year + 1}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  if (interval === 'quarterly') {
    const date = new Date(year, month - 1 + 3, day);
    return toIsoDate(date);
  }
  const date = new Date(year, month - 1 + 1, day);
  return toIsoDate(date);
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

function sumEventsByDirection(
  events: FinancialCalendarEvent[],
  direction: 'inflow' | 'outflow',
): number {
  return roundMoney(
    events
      .filter((event) => event.direction === direction)
      .reduce((sum, event) => sum + event.amount, 0),
  );
}

function findNextIncomeDate(
  events: FinancialCalendarEvent[],
  afterDate: string,
): string | undefined {
  return events
    .filter((event) => event.direction === 'inflow' && event.date > afterDate)
    .sort((a, b) => a.date.localeCompare(b.date))[0]?.date;
}

function classifyRisk(
  balance: number,
  lowThreshold: number,
): FinancialCalendarDayRisk {
  if (balance < 0) return 'risk';
  if (balance <= lowThreshold) return 'attention';
  return 'neutral';
}

function findProblemStart(
  days: FinancialCalendarProjectionDay[],
  riskIndex: number,
  lowThreshold: number,
): string | undefined {
  if (riskIndex < 0) return undefined;
  for (let i = riskIndex; i >= 0; i -= 1) {
    if (days[i].projectedBalance >= lowThreshold) {
      return days[i + 1]?.date ?? days[riskIndex].date;
    }
  }
  return days[0]?.date;
}

function groupEventsByDate(events: FinancialCalendarEvent[]): Map<string, FinancialCalendarEvent[]> {
  const map = new Map<string, FinancialCalendarEvent[]>();
  for (const event of events) {
    const bucket = map.get(event.date) ?? [];
    bucket.push(event);
    map.set(event.date, bucket);
  }
  return map;
}

/**
 * Calendário financeiro prospectivo — cruza vencimentos, recorrências e rendimento
 * com saldo projetado (reutiliza buildCashflowProjection).
 */
export function buildFinancialCalendar(
  financialState: FinancialState,
  horizonDays: number,
  context: BuildFinancialCalendarContext,
): FinancialCalendarResult {
  const asOf = startOfDay(context.asOf ?? financialState.asOf);
  const horizon = clampHorizonDays(horizonDays);
  const projectionHorizon = resolveProjectionHorizon(horizon);
  const horizonEndIso = toIsoDate(addDays(asOf, horizon));

  const projectionInput = {
    transactions: context.transactions,
    subscriptions: context.subscriptions,
    credits: context.credits,
    goalContributions: context.goalContributions ?? [],
    loanPayments: context.loanPayments ?? [],
    prioritizeDebtAmortization: context.prioritizeDebtAmortization ?? true,
    horizon: projectionHorizon,
    asOf,
  };

  const projection = buildCashflowProjection(projectionInput);
  const projectedEvents = buildCashflowScheduledEvents(projectionInput);

  const detectedIncome = detectRecurringIncomeFromTransactions(context.transactions);
  const detectedSubscriptions = detectSubscriptionsFromTransactions(
    context.transactions,
    context.subscriptions,
    context.dismissedSubscriptionIds ?? [],
  );

  const informationalEvents = [
    ...scheduleDetectedSubscriptions(detectedSubscriptions, asOf, horizonEndIso),
    ...scheduleDetectedIncome(detectedIncome, asOf, horizonEndIso),
  ];

  const allEvents = [...projectedEvents, ...informationalEvents];
  const eventsByDate = groupEventsByDate(allEvents);

  const incomePatternDetected =
    detectedIncome.length > 0 || projection.incomeMedianMonthly > 0;

  const incomePatternNote = !incomePatternDetected
    ? 'Rendimento não confirmado — calendário mostra só despesas conhecidas.'
    : detectedIncome.length > 0
      ? 'Rendimento baseado em padrão detetado nas tuas transacções.'
      : 'Rendimento estimado pela mediana dos últimos meses.';

  const lowBalanceThreshold = roundMoney(
    Math.max(100, projection.incomeMedianMonthly > 0 ? projection.incomeMedianMonthly * 0.1 : 100),
  );

  const days: FinancialCalendarProjectionDay[] = projection.points
    .filter((point) => point.dayIndex <= horizon)
    .map((point) => {
      const dayEvents = eventsByDate.get(point.date) ?? [];
      return {
        date: point.date,
        dayIndex: point.dayIndex,
        projectedBalance: point.balance,
        risk: classifyRisk(point.balance, lowBalanceThreshold),
        events: dayEvents,
        outflowTotal: sumEventsByDirection(dayEvents, 'outflow'),
        inflowTotal: sumEventsByDirection(dayEvents, 'inflow'),
        nextIncomeDate: findNextIncomeDate(dayEvents, point.date),
      };
    });

  for (let i = 0; i < days.length; i += 1) {
    if (days[i].risk === 'risk' || days[i].risk === 'attention') {
      days[i].problemStartsOn = findProblemStart(days, i, lowBalanceThreshold);
    }
  }

  const riskDays = days.filter((day) => day.risk === 'risk');

  return {
    days,
    horizonDays: horizon,
    projectionHorizon,
    asOf,
    incomePatternDetected,
    incomePatternNote,
    detectedIncome,
    riskDays,
    firstRiskDay: riskDays[0],
    lowBalanceThreshold,
  };
}

/** Alias legado para FinancialCalendarDay (timeline mensal). */
export type FinancialCalendarDay = MonthlySpendingCalendarDay;
