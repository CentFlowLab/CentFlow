import AsyncStorage from '@react-native-async-storage/async-storage';
import { screen, waitFor } from '@testing-library/react-native';

import { RepositoriesProvider, type Repositories } from '@/data';
import { openTestRepositories } from '@/test-utils/node-sqlite-driver';
import { renderWithProviders } from '@/test-utils/render';

import { DashboardScreen } from '../DashboardScreen';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  router: { push: (...args: unknown[]) => mockPush(...args), navigate: jest.fn() },
}));

let db: Awaited<ReturnType<typeof openTestRepositories>>['db'];
let repos: Repositories;

beforeEach(async () => {
  ({ db, repos } = await openTestRepositories());
  mockPush.mockClear();
  await AsyncStorage.removeItem('centflow:onboarding:seen');
});

afterEach(() => db.close());

describe('first-run onboarding trigger', () => {
  it('never opens for someone who already has accounts', async () => {
    await repos.accounts.create({
      name: 'Banco',
      type: 'bank',
      currency: 'EUR',
      initialBalance: 1000,
    });
    await renderWithProviders(
      <RepositoriesProvider repositories={repos}>
        <DashboardScreen />
      </RepositoriesProvider>,
    );
    expect(await screen.findByText('Disponível nas contas')).toBeOnTheScreen();
    expect(mockPush).not.toHaveBeenCalledWith('/onboarding');
  });

  it('opens once without accounts and not again after being seen', async () => {
    const view = await renderWithProviders(
      <RepositoriesProvider repositories={repos}>
        <DashboardScreen />
      </RepositoriesProvider>,
    );
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/onboarding'));
    view.unmount();

    mockPush.mockClear();
    await AsyncStorage.setItem('centflow:onboarding:seen', '1');
    await renderWithProviders(
      <RepositoriesProvider repositories={repos}>
        <DashboardScreen />
      </RepositoriesProvider>,
    );
    expect(await screen.findByText('Começa pela tua primeira conta')).toBeOnTheScreen();
    expect(mockPush).not.toHaveBeenCalledWith('/onboarding');
  });
});
