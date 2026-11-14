import { openTestRepositories } from '@/test-utils/node-sqlite-driver';

import { loadForecastInput } from '../MonthInsights';

describe('month forecast input', () => {
  it('starts from the same available money as the dashboard: card debt is left out', async () => {
    const { db, repos } = await openTestRepositories();
    await repos.accounts.create({
      name: 'Ordenado',
      type: 'bank',
      currency: 'EUR',
      initialBalance: 60744,
    });
    await repos.accounts.create({
      name: 'Cartão',
      type: 'card',
      currency: 'EUR',
      initialBalance: -500000,
    });
    await repos.accounts.create({
      name: 'Cartão a favor',
      type: 'card',
      currency: 'EUR',
      initialBalance: 1000,
    });
    const input = await loadForecastInput(repos, '2026-11-13', 'EUR');
    expect(input.availableBalance).toBe(61744);
    await db.close();
  });
});
