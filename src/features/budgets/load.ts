import {
  addMonths,
  assessBudget,
  monthOf,
  monthRange,
  resolvePrimaryCurrency,
  type Account,
  type Budget,
  type BudgetCandidate,
  type BudgetFigures,
  type BudgetWindow,
  type CalendarDate,
  type Category,
  type Entry,
} from '@/core/finance';
import type { Repositories } from '@/data';

export type PresentedBudget = {
  budget: Budget;
  category: Category | null;
  window: BudgetWindow | null;
  figures: BudgetFigures;
  previous: BudgetFigures | null;
};

export type BudgetScreenData = {
  budgets: Budget[];
  categories: Category[];
  accounts: Account[];
  lines: BudgetCandidate[];
  presented: PresentedBudget[];
};

export function presentBudgets(
  budgets: readonly Budget[],
  categories: readonly Category[],
  lines: readonly BudgetCandidate[],
  reference: CalendarDate,
  startDay = 1,
): PresentedBudget[] {
  const byId = new Map(categories.map((category) => [category.id, category]));
  return budgets.map((budget) => ({
    budget,
    category: byId.get(budget.categoryId) ?? null,
    ...assessBudget(budget, lines, reference, startDay),
  }));
}

export function budgetCurrencies(
  budgets: readonly { currency: string }[],
  accountCurrencies: readonly string[],
  primaryPreference: 'auto' | string = 'auto',
): string[] {
  const used = [...new Set(budgets.map((budget) => budget.currency))];
  if (used.length === 0) return [];
  const primary = resolvePrimaryCurrency(
    primaryPreference,
    accountCurrencies.length > 0 ? accountCurrencies : used,
  );
  return used.sort((left, right) =>
    left === primary ? -1 : right === primary ? 1 : left.localeCompare(right),
  );
}

export async function loadBudgetScreen(
  repositories: Repositories,
  reference: CalendarDate,
  startDay = 1,
): Promise<BudgetScreenData> {
  // Um mês a mais de cada lado: os períodos financeiros podem começar no mês civil anterior.
  const from = monthRange(addMonths(monthOf(reference), -25)).start;
  const to = monthRange(addMonths(monthOf(reference), 13)).end;
  const [budgets, categories, accounts, lines] = await Promise.all([
    repositories.budgets.list(),
    repositories.categories.list('expense'),
    repositories.accounts.list({ includeArchived: true }),
    repositories.entries.listExpenses({ from, to }),
  ]);
  return {
    budgets,
    categories,
    accounts,
    lines,
    presented: presentBudgets(budgets, categories, lines, reference, startDay),
  };
}

export async function loadBudgetDetail(
  repositories: Repositories,
  id: string,
  reference: CalendarDate,
  startDay = 1,
): Promise<BudgetScreenData & { item: PresentedBudget | null; history: Entry[] }> {
  const screen = await loadBudgetScreen(repositories, reference, startDay);
  const item = screen.presented.find((entry) => entry.budget.id === id) ?? null;
  if (!item?.window) return { ...screen, item, history: [] };
  const page = await repositories.entries.list({
    type: 'expense',
    categoryId: item.budget.categoryId,
    from: item.window.start,
    to: item.window.end,
    limit: 200,
  });
  const currencies = new Map(screen.accounts.map((account) => [account.id, account.currency]));
  const history = page.items.filter(
    (entry) => currencies.get(entry.accountId) === item.budget.currency,
  );
  return { ...screen, item, history };
}
