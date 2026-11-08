import type { CalendarDate } from '@/core/finance';
import type { Repositories } from '@/data';

export async function loadReport(
  repositories: Repositories,
  current: { from: CalendarDate; to: CalendarDate },
  previous: { from: CalendarDate; to: CalendarDate },
) {
  const from = previous.from < current.from ? previous.from : current.from;
  const to = current.to > previous.to ? current.to : previous.to;
  const [rows, expenses, subscriptions, goals, accounts, categories, budgets] = await Promise.all([
    repositories.entries.aggregateByDate({ from, to }),
    repositories.entries.listExpenses(current),
    repositories.subscriptions.list(),
    repositories.goals.progress(current),
    repositories.accounts.list({ includeArchived: true }),
    repositories.categories.list(),
    repositories.budgets.list(),
  ]);
  return { rows, expenses, subscriptions, goals, accounts, categories, budgets };
}
