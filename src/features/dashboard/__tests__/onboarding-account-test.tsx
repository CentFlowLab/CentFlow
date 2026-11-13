import AsyncStorage from '@react-native-async-storage/async-storage';
import { screen, waitFor } from '@testing-library/react-native';

import { RepositoriesProvider, type Repositories } from '@/data';
import { openTestRepositories } from '@/test-utils/node-sqlite-driver';
import { renderWithProviders } from '@/test-utils/render';

import { DashboardScreen } from '../DashboardScreen';

/**
 * Onboarding por conta (ADR-067), com sessão iniciada: o servidor e a primeira sincronização
 * decidem, nunca só o aparelho.
 */
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  router: { push: (...args: unknown[]) => mockPush(...args), navigate: jest.fn() },
}));

let mockUserId = 'user-a';
let mockProfile: { data: unknown; error: unknown } = { data: null, error: null };
const mockRpc = jest.fn(async (_name: string) => ({ error: null }));
// O cliente é estável, como na app (um por sessão).
const mockFrom = jest.fn((_table: string) => ({
  select: () => ({ maybeSingle: async () => mockProfile }),
}));
const mockClient = {
  from: (table: string) => mockFrom(table),
  rpc: (name: string) => mockRpc(name),
};
jest.mock('../../account/AuthProvider', () => ({
  ...jest.requireActual('../../account/AuthProvider'),
  useAuth: () => ({
    state: { status: 'signedIn', user: { id: mockUserId } },
    client: mockClient,
    actions: {},
  }),
}));

let mockSnapshot: { status: string; lastSyncedAt: string | null } | null = null;
jest.mock('../../account/SyncProvider', () => ({
  ...jest.requireActual('../../account/SyncProvider'),
  useSync: () => ({ snapshot: mockSnapshot }),
}));

let db: Awaited<ReturnType<typeof openTestRepositories>>['db'];
let repos: Repositories;

const synced = { status: 'idle', lastSyncedAt: '2026-11-12T10:00:00.000Z' };
const notCompleted = { data: { onboarding_completed_at: null }, error: null };
const completed = { data: { onboarding_completed_at: '2026-11-01T10:00:00.000Z' }, error: null };

async function renderDashboard() {
  return renderWithProviders(
    <RepositoriesProvider repositories={repos}>
      <DashboardScreen />
    </RepositoriesProvider>,
  );
}

beforeEach(async () => {
  ({ db, repos } = await openTestRepositories());
  await AsyncStorage.clear();
  mockPush.mockClear();
  mockRpc.mockClear();
  mockFrom.mockClear();
  // Cada teste usa outra conta: a regra "uma vez por sessão" é por conta.
  mockUserId = `user-${Math.random().toString(36).slice(2)}`;
});

afterEach(() => db.close());

describe('onboarding per account (ADR-067)', () => {
  it('opens for a new account once the server and the first sync confirm it is empty', async () => {
    mockProfile = notCompleted;
    mockSnapshot = synced;
    await renderDashboard();
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/onboarding'));
  });

  it('waits on a fresh device until the first sync, instead of showing onboarding early', async () => {
    mockProfile = notCompleted;
    mockSnapshot = { status: 'syncing', lastSyncedAt: null };
    await renderDashboard();
    expect(await screen.findByLabelText('A carregar…')).toBeOnTheScreen();
    expect(screen.queryByText('Começa pela tua primeira conta')).toBeNull();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('does not open on another device when the account already completed it', async () => {
    mockProfile = completed;
    mockSnapshot = { status: 'syncing', lastSyncedAt: null };
    await renderDashboard();
    expect(await screen.findByText('Começa pela tua primeira conta')).toBeOnTheScreen();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('treats an existing account with data as completed and records it on the server', async () => {
    mockProfile = notCompleted;
    mockSnapshot = synced;
    await repos.accounts.create({
      name: 'Banco',
      type: 'bank',
      currency: 'EUR',
      initialBalance: 1000,
    });
    await renderDashboard();
    expect(await screen.findByText('Disponível nas contas')).toBeOnTheScreen();
    await waitFor(() => expect(mockRpc).toHaveBeenCalledWith('complete_onboarding'));
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('does not open without a network when the profile cannot be read', async () => {
    mockProfile = { data: null, error: { message: 'offline' } };
    mockSnapshot = { status: 'offline', lastSyncedAt: null };
    await renderDashboard();
    expect(await screen.findByText('Começa pela tua primeira conta')).toBeOnTheScreen();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('sends a completion made offline as soon as the server answers', async () => {
    await AsyncStorage.setItem(`centflow:onboarding:pending:${mockUserId}`, '1');
    await AsyncStorage.setItem(`centflow:onboarding:done:${mockUserId}`, '1');
    mockProfile = notCompleted;
    mockSnapshot = synced;
    await renderDashboard();
    await waitFor(() => expect(mockRpc).toHaveBeenCalledWith('complete_onboarding'));
    expect(mockPush).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem(`centflow:onboarding:pending:${mockUserId}`)).toBeNull();
  });

  it('does not reuse the completion of another account on the same device', async () => {
    await AsyncStorage.setItem('centflow:onboarding:done:other-user', '1');
    await AsyncStorage.setItem('centflow:onboarding:seen', '1');
    mockProfile = notCompleted;
    mockSnapshot = synced;
    await renderDashboard();
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/onboarding'));
  });

  it('does not ask the server again once it confirmed the account', async () => {
    await AsyncStorage.setItem(`centflow:onboarding:done:${mockUserId}`, '1');
    mockProfile = notCompleted;
    mockSnapshot = synced;
    await renderDashboard();
    expect(await screen.findByText('Começa pela tua primeira conta')).toBeOnTheScreen();
    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('shows the real empty state after the first sync even if the server cannot answer', async () => {
    mockProfile = { data: null, error: { message: 'column does not exist' } };
    mockSnapshot = synced;
    await renderDashboard();
    expect(await screen.findByText('Começa pela tua primeira conta')).toBeOnTheScreen();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('treats an account with only net-worth items as already set up', async () => {
    mockProfile = notCompleted;
    mockSnapshot = synced;
    await repos.wealth.create({
      name: 'Casa',
      type: 'property',
      amount: 15000000,
      currency: 'EUR',
      valuedOn: '2026-11-01',
    });
    await renderDashboard();
    await waitFor(() => expect(mockRpc).toHaveBeenCalledWith('complete_onboarding'));
    expect(mockPush).not.toHaveBeenCalled();
  });
});
