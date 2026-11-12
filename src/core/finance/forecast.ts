import type { CurrencyCode } from '../money';
import { addDays, addMonths, monthOf, monthRange, type CalendarDate, type MonthKey } from './dates';
import { daysUntil } from './deadlines';
import { annualAmountMinor } from './subscriptions';
import type { Id, Subscription, SubscriptionPeriod } from './types';

/**
 * Previsão do mês e alertas a partir dos dados que a pessoa já registou. Nada aqui é inventado:
 * quando não há histórico suficiente, a previsão diz que não existe (`basis: 'none'`).
 */

/** Meses completos anteriores usados como "habitual". */
export const HISTORY_MONTHS = 3;
/** Meses com movimentos necessários para confiar no habitual. */
export const MIN_HISTORY_MONTHS = 2;
/** Sem histórico, o ritmo do próprio mês só conta a partir deste dia. */
export const MIN_DAYS_FOR_MONTH_PACE = 7;

function daysInMonth(month: MonthKey): number {
  return Number(monthRange(month).end.slice(8, 10));
}

function dayOfMonth(date: CalendarDate): number {
  return Number(date.slice(8, 10));
}

/** Mesma data `months` meses depois; o dia 31 passa a ser o último dia de meses mais curtos. */
function shiftMonths(date: CalendarDate, months: number, day: number): CalendarDate {
  const month = addMonths(monthOf(date), months);
  const last = daysInMonth(month);
  return `${month}-${String(Math.min(day, last)).padStart(2, '0')}`;
}

/**
 * Cobranças de uma subscrição entre `from` e `to` (inclusive). A data guardada (`nextOn`) pode já
 * ter passado: as cobranças seguintes calculam-se a partir dela, pelo período.
 */
export function chargesBetween(
  subscription: Pick<Subscription, 'nextOn' | 'period' | 'status'>,
  from: CalendarDate,
  to: CalendarDate,
): CalendarDate[] {
  if (subscription.status !== 'active' || from > to) return [];
  const anchorDay = dayOfMonth(subscription.nextOn);
  const at = (index: number): CalendarDate => {
    if (subscription.period === 'weekly') return addDays(subscription.nextOn, index * 7);
    return shiftMonths(
      subscription.nextOn,
      index * (subscription.period === 'yearly' ? 12 : 1),
      anchorDay,
    );
  };
  const dates: CalendarDate[] = [];
  // Limite de segurança: datas muito antigas avançam no máximo ~20 anos semanais.
  for (let index = 0; index < 1100; index += 1) {
    const date = at(index);
    if (date > to) break;
    if (date >= from) dates.push(date);
  }
  return dates;
}

/** Cobrança seguinte à data guardada (`nextOn`), pelo período: depois de registar um pagamento. */
export function followingCharge(
  subscription: Pick<Subscription, 'nextOn' | 'period'>,
): CalendarDate {
  if (subscription.period === 'weekly') return addDays(subscription.nextOn, 7);
  return shiftMonths(
    subscription.nextOn,
    subscription.period === 'yearly' ? 12 : 1,
    dayOfMonth(subscription.nextOn),
  );
}

export type UpcomingCharge = {
  subscriptionId: Id;
  name: string;
  date: CalendarDate;
  amount: number;
};

export type MonthHistory = {
  month: MonthKey;
  income: number;
  expense: number;
  /** Despesa por categoria (sem transferências). */
  byCategory: ReadonlyMap<Id, number>;
};

export type ForecastInput = {
  today: CalendarDate;
  currency: CurrencyCode;
  /** Saldo das contas de uso diário (banco, dinheiro, cartão), já com os movimentos registados. */
  availableBalance: number;
  /** Movimentos do mês atual até hoje, nesta moeda. */
  monthToDate: Omit<MonthHistory, 'month'>;
  /** Meses completos anteriores (do mais antigo ao mais recente), nesta moeda. */
  history: readonly MonthHistory[];
  subscriptions: readonly Subscription[];
};

export type ForecastBasis = 'history' | 'monthPace' | 'none';

export type MonthForecast = {
  basis: ForecastBasis;
  /** Dias até ao fim do mês, contando hoje. */
  daysLeft: number;
  upcomingCharges: UpcomingCharge[];
  upcomingTotal: number;
  /** Gasto habitual por dia, sem subscrições. `null` sem base. */
  dailySpend: number | null;
  /** Gastos previstos de amanhã até ao fim do mês. */
  projectedSpending: number;
  /** Rendimento habitual que ainda não entrou este mês (0 sem histórico). */
  expectedIncome: number;
  /** Saldo previsto no último dia do mês. `null` sem base. */
  endBalance: number | null;
  /** Quanto se pode gastar por dia até ao fim do mês depois das subscrições, sem contar com rendimentos futuros. */
  dailyAllowance: number;
};

function monthlySubscriptionCost(subscriptions: readonly Subscription[], currency: string): number {
  let yearly = 0;
  for (const item of subscriptions) {
    if (item.status === 'active' && item.currency === currency) {
      yearly += annualAmountMinor(item.period, item.amount);
    }
  }
  return Math.trunc(yearly / 12);
}

/** Meses do histórico que têm algum movimento. */
function usableHistory(history: readonly MonthHistory[]): MonthHistory[] {
  return history.filter((month) => month.income > 0 || month.expense > 0);
}

export function buildMonthForecast(input: ForecastInput): MonthForecast {
  const { today, currency } = input;
  const month = monthOf(today);
  const total = daysInMonth(month);
  const day = dayOfMonth(today);
  const daysLeft = total - day + 1;
  const end = monthRange(month).end;

  const upcomingCharges = input.subscriptions
    .filter((item) => item.currency === currency)
    .flatMap((item) =>
      chargesBetween(item, today, end).map((date) => ({
        subscriptionId: item.id,
        name: item.name,
        date,
        amount: item.amount,
      })),
    )
    .sort((a, b) => (a.date === b.date ? a.name.localeCompare(b.name) : a.date < b.date ? -1 : 1));
  const upcomingTotal = upcomingCharges.reduce((sum, charge) => sum + charge.amount, 0);
  const dailyAllowance = Math.max(
    0,
    Math.floor((input.availableBalance - upcomingTotal) / daysLeft),
  );

  const usable = usableHistory(input.history);
  const subscriptionsMonthly = monthlySubscriptionCost(input.subscriptions, currency);
  let basis: ForecastBasis = 'none';
  let dailySpend: number | null = null;
  let expectedIncome = 0;

  if (usable.length >= MIN_HISTORY_MONTHS) {
    basis = 'history';
    const averageExpense = Math.round(
      usable.reduce((sum, item) => sum + item.expense, 0) / usable.length,
    );
    // As subscrições já entram à parte (`upcomingCharges`): o ritmo diário fica sem elas.
    const variableMonthly = Math.max(0, averageExpense - subscriptionsMonthly);
    dailySpend = Math.round((variableMonthly * 12) / 365);
    const withIncome = usable.filter((item) => item.income > 0);
    if (withIncome.length >= MIN_HISTORY_MONTHS) {
      const averageIncome = Math.round(
        withIncome.reduce((sum, item) => sum + item.income, 0) / withIncome.length,
      );
      expectedIncome = Math.max(0, averageIncome - input.monthToDate.income);
    }
  } else if (day >= MIN_DAYS_FOR_MONTH_PACE && input.monthToDate.expense > 0) {
    basis = 'monthPace';
    dailySpend = Math.round(input.monthToDate.expense / day);
  }

  const projectedSpending = dailySpend === null ? 0 : dailySpend * (daysLeft - 1);
  const endBalance =
    basis === 'none'
      ? null
      : input.availableBalance + expectedIncome - upcomingTotal - projectedSpending;

  return {
    basis,
    daysLeft,
    upcomingCharges,
    upcomingTotal,
    dailySpend,
    projectedSpending,
    expectedIncome,
    endBalance,
    dailyAllowance,
  };
}

/** Dias em que uma subida de preço continua a ser assinalada no Início. */
export const PRICE_RISE_WINDOW_DAYS = 60;

export type PriceRise = {
  subscriptionId: Id;
  name: string;
  period: SubscriptionPeriod;
  currency: string;
  previous: number;
  amount: number;
  changedOn: CalendarDate;
  /** Quanto custa a mais por ano. */
  yearlyIncrease: number;
};

/** Subscrições ativas cujo preço subiu nos últimos `windowDays` dias (a maior subida primeiro). */
export function recentPriceRises(
  subscriptions: readonly Subscription[],
  today: CalendarDate,
  windowDays: number = PRICE_RISE_WINDOW_DAYS,
): PriceRise[] {
  const rises: PriceRise[] = [];
  for (const item of subscriptions) {
    if (item.status !== 'active' || item.previousAmount === null || !item.amountChangedOn) continue;
    if (item.amount <= item.previousAmount) continue;
    const age = -(daysUntil(item.amountChangedOn, today) ?? 0);
    if (age < 0 || age > windowDays) continue;
    rises.push({
      subscriptionId: item.id,
      name: item.name,
      period: item.period,
      currency: item.currency,
      previous: item.previousAmount,
      amount: item.amount,
      changedOn: item.amountChangedOn,
      yearlyIncrease: annualAmountMinor(item.period, item.amount - item.previousAmount),
    });
  }
  return rises.sort((a, b) => b.yearlyIncrease - a.yearlyIncrease);
}

export type SpendingInsight =
  /** Uma subscrição subiu de preço há pouco tempo. */
  | ({ kind: 'priceRise' } & PriceRise)
  /** Uma categoria vai acima do habitual para esta altura do mês. */
  | {
      kind: 'categoryAbove';
      categoryId: Id;
      spent: number;
      /** Média mensal dos meses anteriores com movimentos. */
      usual: number;
      ratio: number;
      /** A este ritmo, quanto o mês fecha acima da média (estimativa, não um valor real). */
      monthExtra: number;
    }
  /** O mês inteiro vai abaixo do habitual para esta altura. */
  | { kind: 'spendingBelow'; spent: number; usual: number; ratio: number }
  /** A previsão acaba o mês com saldo negativo. */
  | { kind: 'endNegative'; endBalance: number };

/** Diferença mínima (unidades mínimas) para um alerta de categoria não ser ruído. */
export const INSIGHT_MIN_EXCESS = 2000;
const ABOVE_RATIO = 1.3;
const BELOW_RATIO = 0.8;
const MIN_DAY_FOR_PACE_INSIGHTS = 5;

/** Até `limit` observações, das mais importantes para as menos. */
export function spendingInsights(
  input: Pick<ForecastInput, 'today' | 'monthToDate' | 'history'> &
    Partial<Pick<ForecastInput, 'subscriptions' | 'currency'>>,
  forecast: Pick<MonthForecast, 'endBalance'>,
  limit = 3,
): SpendingInsight[] {
  const insights: SpendingInsight[] = [];
  if (forecast.endBalance !== null && forecast.endBalance < 0) {
    insights.push({ kind: 'endNegative', endBalance: forecast.endBalance });
  }
  for (const rise of recentPriceRises(input.subscriptions ?? [], input.today)) {
    if (!input.currency || rise.currency === input.currency) {
      insights.push({ kind: 'priceRise', ...rise });
    }
  }

  const usable = usableHistory(input.history);
  const month = monthOf(input.today);
  const day = dayOfMonth(input.today);
  if (usable.length >= MIN_HISTORY_MONTHS && day >= MIN_DAY_FOR_PACE_INSIGHTS) {
    const share = day / daysInMonth(month);
    const usualFor = (amounts: number[]) =>
      Math.round(amounts.reduce((sum, value) => sum + value, 0) / usable.length);

    const categories = new Set<Id>();
    for (const item of usable) for (const id of item.byCategory.keys()) categories.add(id);
    for (const id of input.monthToDate.byCategory.keys()) categories.add(id);

    const above: SpendingInsight[] = [];
    for (const id of categories) {
      const usual = usualFor(usable.map((item) => item.byCategory.get(id) ?? 0));
      const spent = input.monthToDate.byCategory.get(id) ?? 0;
      const expectedSoFar = usual * share;
      if (usual <= 0) continue;
      if (spent >= expectedSoFar * ABOVE_RATIO && spent - expectedSoFar >= INSIGHT_MIN_EXCESS) {
        above.push({
          kind: 'categoryAbove',
          categoryId: id,
          spent,
          usual,
          monthExtra: Math.max(0, Math.round(spent / share) - usual),
          ratio: spent / expectedSoFar,
        });
      }
    }
    above.sort((a, b) => excess(b, share) - excess(a, share));
    insights.push(...above);

    const usualTotal = usualFor(usable.map((item) => item.expense));
    const expectedTotal = usualTotal * share;
    const spent = input.monthToDate.expense;
    if (
      above.length === 0 &&
      usualTotal > 0 &&
      day >= 10 &&
      spent <= expectedTotal * BELOW_RATIO &&
      expectedTotal - spent >= INSIGHT_MIN_EXCESS
    ) {
      insights.push({
        kind: 'spendingBelow',
        spent,
        usual: usualTotal,
        ratio: spent / expectedTotal,
      });
    }
  }
  return insights.slice(0, limit);
}

function excess(insight: SpendingInsight, share: number): number {
  return insight.kind === 'categoryAbove' ? insight.spent - insight.usual * share : 0;
}
