import { screen } from '@testing-library/react-native';

import { RepositoriesProvider, type Repositories } from '@/data';
import { openTestRepositories } from '@/test-utils/node-sqlite-driver';
import { renderWithProviders } from '@/test-utils/render';

import { BudgetsScreen } from '../../budgets/BudgetsScreen';
import { ReportsScreen } from '../ReportsScreen';

// ADR-077/079: o início do mês é uma definição da conta; Relatórios e Orçamentos usam-na.
jest.mock('../../finance/useToday', () => ({ useToday: () => '2026-11-13' }));

let db: Awaited<ReturnType<typeof openTestRepositories>>['db'];
let repos: Repositories;
beforeEach(async () => {
  ({ db, repos } = await openTestRepositories());
});
afterEach(() => db.close());

const render = (ui: React.ReactElement) =>
  renderWithProviders(<RepositoriesProvider repositories={repos}>{ui}</RepositoriesProvider>);

async function seedAccount() {
  await repos.accounts.create({ name: 'Banco', type: 'bank', currency: 'EUR', initialBalance: 0 });
}

describe('financial month from the account setting', () => {
  it('reports the month from the 25th to the 24th', async () => {
    await seedAccount();
    await repos.settings.set('financial_month_start_day', '25');
    await render(<ReportsScreen />);
    expect(await screen.findByText(/25\/10\/2026\s?–\s?24\/11\/2026/)).toBeOnTheScreen();
  });

  it('keeps the calendar month with no setting', async () => {
    await seedAccount();
    await render(<ReportsScreen />);
    expect(await screen.findByText(/^0?1\/11\/2026\s?–\s?30\/11\/2026$/)).toBeOnTheScreen();
  });

  it('shows the financial period on the budgets month bar', async () => {
    await seedAccount();
    await repos.settings.set('financial_month_start_day', '25');
    await render(<BudgetsScreen />);
    expect(await screen.findByLabelText(/^Novembro de 2026 \(25\/10 – 24\/11\)/)).toBeOnTheScreen();
  });
});
