import type { CurrencyCode } from '../money';
import { MIN_HISTORY_MONTHS, type MonthHistory } from './forecast';
import { annualAmountMinor } from './subscriptions';
import type { AccountType, Subscription } from './types';

/**
 * Saúde financeira explicável (ADR-043). Três pilares medidos com dados reais; cada um diz o que
 * mede, o valor e o estado. Sem dados suficientes o estado é `noData` (nunca "mau").
 * As referências são gerais (regra 50/30/20, fundo de emergência de 3 a 6 meses) e não são
 * aconselhamento financeiro.
 */
export type HealthStatus = 'good' | 'fair' | 'attention' | 'noData';

export type HealthPillar =
  /** (rendimentos − despesas) ÷ rendimentos nos meses anteriores. */
  | { key: 'savingsRate'; status: HealthStatus; value: number | null }
  /**
   * Meses de despesas cobertos pelo dinheiro em bancos, numerário e poupança. Sem categorias
   * essenciais marcadas usa a despesa total (estimativa prudente); com alguma, só as essenciais.
   */
  | {
      key: 'emergencyFund';
      status: HealthStatus;
      value: number | null;
      basis: 'allExpenses' | 'essentialExpenses';
    }
  /** Encargos fixos registados como subscrições ÷ rendimento médio. */
  | { key: 'fixedCosts'; status: HealthStatus; value: number | null };

export type FinancialHealth = {
  overall: 'solid' | 'fair' | 'attention' | 'noData';
  pillars: HealthPillar[];
};

export const SAVINGS_RATE_GOOD = 0.2;
export const SAVINGS_RATE_FAIR = 0.1;
export const EMERGENCY_MONTHS_GOOD = 6;
export const EMERGENCY_MONTHS_FAIR = 3;
export const FIXED_COSTS_GOOD = 0.35;
export const FIXED_COSTS_FAIR = 0.5;

/** Contas que contam para o fundo de emergência (investimentos e cartões ficam de fora). */
const RESERVE_TYPES: ReadonlySet<AccountType> = new Set(['bank', 'cash', 'savings']);

export type HealthInput = {
  currency: CurrencyCode;
  accounts: readonly { type: AccountType; currency: string; balance: number }[];
  /** Meses completos anteriores, nesta moeda. */
  history: readonly MonthHistory[];
  subscriptions: readonly Subscription[];
  /** Categorias de despesa marcadas como essenciais (vazio: usa todas as despesas). */
  essentialCategoryIds?: ReadonlySet<string>;
};

export function buildFinancialHealth(input: HealthInput): FinancialHealth {
  const months = input.history.filter((month) => month.income > 0 || month.expense > 0);
  const withIncome = months.filter((month) => month.income > 0);

  // Taxa de poupança: só com rendimentos registados em pelo menos dois meses.
  let savingsRate: HealthPillar = { key: 'savingsRate', status: 'noData', value: null };
  if (withIncome.length >= MIN_HISTORY_MONTHS) {
    const income = withIncome.reduce((sum, month) => sum + month.income, 0);
    const expense = withIncome.reduce((sum, month) => sum + month.expense, 0);
    const rate = (income - expense) / income;
    savingsRate = {
      key: 'savingsRate',
      value: rate,
      status: rate >= SAVINGS_RATE_GOOD ? 'good' : rate >= SAVINGS_RATE_FAIR ? 'fair' : 'attention',
    };
  }

  // Fundo de emergência: dinheiro disponível ÷ despesa mensal média.
  const essential = input.essentialCategoryIds ?? new Set<string>();
  const basis = essential.size > 0 ? 'essentialExpenses' : 'allExpenses';
  const monthlyNeed = (month: MonthHistory) =>
    basis === 'allExpenses'
      ? month.expense
      : [...month.byCategory].reduce(
          (sum, [categoryId, amount]) => (essential.has(categoryId) ? sum + amount : sum),
          0,
        );
  const needMonths = months.filter((month) => monthlyNeed(month) > 0);
  let emergencyFund: HealthPillar = {
    key: 'emergencyFund',
    status: 'noData',
    value: null,
    basis,
  };
  if (needMonths.length >= MIN_HISTORY_MONTHS) {
    const averageExpense =
      needMonths.reduce((sum, month) => sum + monthlyNeed(month), 0) / needMonths.length;
    const reserve = input.accounts
      .filter((account) => account.currency === input.currency && RESERVE_TYPES.has(account.type))
      .reduce((sum, account) => sum + account.balance, 0);
    const covered = Math.max(0, reserve) / averageExpense;
    emergencyFund = {
      key: 'emergencyFund',
      basis,
      value: covered,
      status:
        covered >= EMERGENCY_MONTHS_GOOD
          ? 'good'
          : covered >= EMERGENCY_MONTHS_FAIR
            ? 'fair'
            : 'attention',
    };
  }

  // Encargos fixos: só se houver subscrições ativas e rendimentos para comparar.
  let fixedCosts: HealthPillar = { key: 'fixedCosts', status: 'noData', value: null };
  const yearlyFixed = input.subscriptions
    .filter((item) => item.status === 'active' && item.currency === input.currency)
    .reduce((sum, item) => sum + annualAmountMinor(item.period, item.amount), 0);
  if (yearlyFixed > 0 && withIncome.length >= MIN_HISTORY_MONTHS) {
    const averageIncome =
      withIncome.reduce((sum, month) => sum + month.income, 0) / withIncome.length;
    const share = yearlyFixed / 12 / averageIncome;
    fixedCosts = {
      key: 'fixedCosts',
      value: share,
      status: share <= FIXED_COSTS_GOOD ? 'good' : share <= FIXED_COSTS_FAIR ? 'fair' : 'attention',
    };
  }

  const pillars = [savingsRate, emergencyFund, fixedCosts];
  const known = pillars.filter((pillar) => pillar.status !== 'noData');
  const overall: FinancialHealth['overall'] =
    known.length === 0
      ? 'noData'
      : known.some((pillar) => pillar.status === 'attention')
        ? 'attention'
        : known.every((pillar) => pillar.status === 'good') && known.length >= 2
          ? 'solid'
          : 'fair';
  return { overall, pillars };
}
