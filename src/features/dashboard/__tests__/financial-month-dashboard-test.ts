import { bucketDailyTotals } from '@/core/finance';
import type { Repositories } from '@/data';
import { openTestRepositories } from '@/test-utils/node-sqlite-driver';

import { loadDashboard } from '../DashboardScreen';
import { loadForecastInput } from '../MonthInsights';

// Mês financeiro no Início (ADR-077): com início 1 nada muda; com início 25 o mês "novembro"
// vai de 25 out a 24 nov.

let db: Awaited<ReturnType<typeof openTestRepositories>>['db'];
let repos: Repositories;

beforeEach(async () => {
  ({ db, repos } = await openTestRepositories());
});

afterEach(() => db.close());

async function seed() {
  const bank = await repos.accounts.create({
    name: 'Banco',
    type: 'bank',
    currency: 'EUR',
    initialBalance: 100_000,
  });
  const food = await repos.categories.create({
    name: 'Supermercado',
    type: 'expense',
    icon: 'cart',
    color: 'green',
  });
  const days = ['2026-09-30', '2026-10-01', '2026-10-24', '2026-10-25', '2026-11-13', '2026-11-25'];
  for (const [index, date] of days.entries()) {
    await repos.entries.create({
      type: 'expense',
      amount: 1000 * (index + 1),
      description: '',
      categoryId: food.id,
      accountId: bank.id,
      destinationAccountId: null,
      date,
      notes: null,
    });
  }
}

const total = (rows: readonly { month: string; amount: number }[], month: string) =>
  rows.filter((row) => row.month === month).reduce((sum, row) => sum + row.amount, 0);

describe('dashboard with a financial month', () => {
  it('gives the same monthly totals by day buckets as the monthly aggregate for day 1', async () => {
    await seed();
    const monthly = await loadDashboard(repos, '2026-11', 1);
    const daily = bucketDailyTotals(
      await repos.entries.aggregateByDate({ from: '2026-06-01', to: '2026-11-30' }),
      1,
    );
    for (const month of ['2026-09', '2026-10', '2026-11']) {
      expect(total(daily, month)).toBe(total(monthly.aggregates, month));
    }
  });

  it('counts 25 Oct – 24 Nov as November when the month starts on the 25th', async () => {
    await seed();
    const data = await loadDashboard(repos, '2026-11', 25);
    // 25 out (4000) + 13 nov (5000).
    expect(total(data.aggregates, '2026-11')).toBe(9000);
    // 25 set – 24 out: 30 set (1000) + 1 out (2000) + 24 out (3000).
    expect(total(data.aggregates, '2026-10')).toBe(6000);
    expect(data.latest.items.map((entry) => entry.date).sort()).toEqual([
      '2026-10-25',
      '2026-11-13',
    ]);
  });

  it('feeds the forecast with the financial month to date', async () => {
    await seed();
    const civil = await loadForecastInput(repos, '2026-11-13', 'EUR');
    const financial = await loadForecastInput(repos, '2026-11-13', 'EUR', 25);
    expect(civil.monthToDate.expense).toBe(5000);
    expect(financial.monthToDate.expense).toBe(9000);
    expect(financial.startDay).toBe(25);
  });
});
