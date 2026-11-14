import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { RepositoriesProvider, type Repositories } from '@/data';
import { openTestRepositories } from '@/test-utils/node-sqlite-driver';
import { renderWithProviders } from '@/test-utils/render';

import { EntriesScreen } from '../EntriesScreen';

// ADR-082: filtro "Por classificar", aplicar a sugestão e marcar como revisto.
jest.mock('../../finance/useToday', () => ({ useToday: () => '2026-11-14' }));

let db: Awaited<ReturnType<typeof openTestRepositories>>['db'];
let repos: Repositories;
beforeEach(async () => {
  ({ db, repos } = await openTestRepositories());
});
afterEach(() => db.close());

async function seed() {
  const moey = await repos.accounts.create({
    name: 'Moey',
    type: 'bank',
    currency: 'EUR',
    initialBalance: 0,
  });
  const other = await repos.categories.create({
    name: 'Outras despesas',
    type: 'expense',
    icon: 'ellipsis-horizontal',
    color: 'gray',
  });
  const coffee = await repos.categories.create({
    name: 'Café',
    type: 'expense',
    icon: 'cafe',
    color: 'orange',
  });
  const base = {
    type: 'expense' as const,
    accountId: moey.id,
    destinationAccountId: null,
    notes: null,
  };
  // Histórico claro: "Pastelaria" é Café.
  for (const date of ['2026-10-01', '2026-10-02']) {
    await repos.entries.create({
      ...base,
      amount: 150,
      description: 'Pastelaria',
      categoryId: coffee.id,
      date,
    });
  }
  await repos.entries.create({
    ...base,
    amount: 150,
    description: 'Pastelaria',
    categoryId: other.id,
    date: '2026-11-13',
    needsReview: true,
  });
  await repos.entries.create({
    ...base,
    amount: 990,
    description: 'Compra online',
    categoryId: other.id,
    date: '2026-11-13',
    needsReview: true,
  });
}

describe('entries to review', () => {
  it('filters the two imported Moey entries and clears them with the actions', async () => {
    await seed();
    await renderWithProviders(
      <RepositoriesProvider repositories={repos}>
        <EntriesScreen />
      </RepositoriesProvider>,
    );
    await fireEvent.press(await screen.findByRole('button', { name: 'Por classificar (2)' }));
    expect(await screen.findByText(/^2 movimentos/)).toBeOnTheScreen();

    await fireEvent.press(await screen.findByRole('button', { name: 'Aplicar: Café' }));
    await waitFor(async () => expect(await repos.entries.countNeedsReview()).toBe(1));

    await fireEvent.press(await screen.findByRole('button', { name: 'Marcar como revisto' }));
    await waitFor(async () => expect(await repos.entries.countNeedsReview()).toBe(0));
  });
});
