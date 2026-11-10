import { fireEvent, screen } from '@testing-library/react-native';

import { RepositoriesProvider, type Repositories } from '@/data';
import { openTestRepositories } from '@/test-utils/node-sqlite-driver';
import { renderWithProviders } from '@/test-utils/render';

import { FinancialHealthCard } from '../FinancialHealthCard';

let db: Awaited<ReturnType<typeof openTestRepositories>>['db'];
let repos: Repositories;

beforeEach(async () => {
  ({ db, repos } = await openTestRepositories());
});

afterEach(() => db.close());

async function seedTwoMonths() {
  const bank = await repos.accounts.create({
    name: 'Banco',
    type: 'bank',
    currency: 'EUR',
    initialBalance: 300_000,
  });
  await repos.accounts.create({
    name: 'Poupança',
    type: 'savings',
    currency: 'EUR',
    initialBalance: 600_000,
  });
  const salary = await repos.categories.create({
    name: 'Salário',
    type: 'income',
    icon: 'briefcase',
    color: 'blue',
  });
  const food = await repos.categories.create({
    name: 'Supermercado',
    type: 'expense',
    icon: 'cart',
    color: 'green',
  });
  for (const month of ['2026-09', '2026-10']) {
    await repos.entries.create({
      type: 'income',
      amount: 200_000,
      description: '',
      categoryId: salary.id,
      accountId: bank.id,
      destinationAccountId: null,
      date: `${month}-01`,
      notes: null,
    });
    await repos.entries.create({
      type: 'expense',
      amount: 140_000,
      description: '',
      categoryId: food.id,
      accountId: bank.id,
      destinationAccountId: null,
      date: `${month}-15`,
      notes: null,
    });
  }
}

describe('FinancialHealthCard', () => {
  it('explains each pillar with real numbers and shows how they are calculated', async () => {
    await seedTwoMonths();
    await renderWithProviders(
      <RepositoriesProvider repositories={repos}>
        <FinancialHealthCard today="2026-11-10" currency="EUR" />
      </RepositoriesProvider>,
    );
    expect(await screen.findByText('Taxa de poupança')).toBeOnTheScreen();
    expect(screen.getByText(/^30\s?%$/)).toBeOnTheScreen();
    // 3000 + 6000 + 2 × (2000 − 1400) = 10 200 € ÷ 1400 € por mês = 7 meses.
    expect(screen.getByText('7 meses')).toBeOnTheScreen();
    expect(screen.getByText(/Regista as despesas fixas/)).toBeOnTheScreen();

    expect(screen.queryByText(/não só as essenciais/)).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Como é calculado' }));
    expect(screen.getByText(/não só as essenciais/)).toBeOnTheScreen();
  });

  it('says what is missing instead of judging a new account', async () => {
    await renderWithProviders(
      <RepositoriesProvider repositories={repos}>
        <FinancialHealthCard today="2026-11-10" currency="EUR" />
      </RepositoriesProvider>,
    );
    expect(await screen.findByText('Ainda sem dados suficientes')).toBeOnTheScreen();
    expect(screen.queryByText('A melhorar')).toBeNull();
  });
});
