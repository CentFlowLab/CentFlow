import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { RepositoriesProvider, type Repositories } from '@/data';
import { openTestRepositories } from '@/test-utils/node-sqlite-driver';
import { renderWithProviders } from '@/test-utils/render';

import { BankCallbackScreen } from '../BankCallbackScreen';
import { BankLinkScreen } from '../BankLinkScreen';
import { BanksScreen } from '../BanksScreen';

const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  router: {
    push: (...args: unknown[]) => mockPush(...args),
    replace: (...args: unknown[]) => mockReplace(...args),
    back: jest.fn(),
    canGoBack: () => false,
  },
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (effect: () => void) => jest.requireActual('react').useEffect(effect, [effect]),
}));

const mockInvoke = jest.fn();
let mockTables: Record<string, unknown[]> = {};
const mockClient = {
  from: (table: string) => ({
    select: () => ({ order: async () => ({ data: mockTables[table] ?? [], error: null }) }),
  }),
  functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
  rpc: jest.fn(async () => ({ error: null })),
};
jest.mock('../../account/AuthProvider', () => ({
  ...jest.requireActual('../../account/AuthProvider'),
  useAuth: () => ({ state: { status: 'signedIn', user: { id: 'u1' } }, client: mockClient }),
}));

let db: Awaited<ReturnType<typeof openTestRepositories>>['db'];
let repos: Repositories;

beforeEach(async () => {
  ({ db, repos } = await openTestRepositories());
  mockPush.mockClear();
  mockReplace.mockClear();
  mockInvoke.mockReset();
  mockParams = {};
  mockTables = {};
});
afterEach(() => db.close());

const render = (ui: React.ReactElement) =>
  renderWithProviders(<RepositoriesProvider repositories={repos}>{ui}</RepositoriesProvider>);

describe('banks screen (ADR-069)', () => {
  it('shows each connection with its accounts, the bank balance and what is linked', async () => {
    const app = await repos.accounts.create({
      name: 'Ordenado',
      type: 'bank',
      currency: 'EUR',
      initialBalance: 100000,
    });
    mockTables = {
      bank_connections: [
        {
          id: 'c1',
          aspsp_name: 'Revolut',
          aspsp_country: 'PT',
          status: 'connected',
          valid_until: '2027-02-10T00:00:00Z',
          last_sync_at: null,
          last_error: null,
        },
      ],
      bank_accounts: [
        {
          id: 'a1',
          connection_id: 'c1',
          name: 'Conta principal',
          iban_last4: '0154',
          currency: 'EUR',
          balance: 125050,
          balance_at: null,
          app_account_id: app.id,
          import_from: '2026-11-13',
        },
        {
          id: 'a2',
          connection_id: 'c1',
          name: 'Poupança',
          iban_last4: null,
          currency: 'EUR',
          balance: null,
          balance_at: null,
          app_account_id: null,
          import_from: null,
        },
      ],
    };
    await render(<BanksScreen />);
    expect(await screen.findByText('Revolut')).toBeOnTheScreen();
    expect(screen.getByText('Ligado')).toBeOnTheScreen();
    expect(screen.getByText('Conta principal ·· 0154')).toBeOnTheScreen();
    expect(screen.getByText(/Movimentos em «Ordenado»/)).toBeOnTheScreen();
    expect(screen.getByText(/Banco: 1250,50\s?€/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: /^Poupança/ }));
    expect(mockPush).toHaveBeenCalledWith('/integrations/bank-account/a2');
  });

  it('says when bank connections are not available yet', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: { context: { json: async () => ({ error: 'notConfigured' }) } },
    });
    await render(<BankLinkScreen />);
    expect(
      await screen.findByText('A ligação a bancos ainda não está disponível. Tenta mais tarde.'),
    ).toBeOnTheScreen();
  });

  it('lists the banks of the chosen country and filters without accents', async () => {
    mockInvoke.mockResolvedValue({
      data: {
        banks: [
          { name: 'Crédito Agrícola', country: 'PT', logo: null },
          { name: 'Revolut', country: 'PT', logo: null },
        ],
      },
      error: null,
    });
    await render(<BankLinkScreen />);
    expect(await screen.findByText('Revolut')).toBeOnTheScreen();
    expect(mockInvoke).toHaveBeenCalledWith('open-banking', {
      method: 'POST',
      body: { action: 'banks', country: 'PT' },
    });
    await fireEvent.changeText(screen.getByLabelText('Procurar banco'), 'credito');
    expect(screen.getByText('Crédito Agrícola')).toBeOnTheScreen();
    expect(screen.queryByText('Revolut')).toBeNull();
  });

  it('finishes the link once with the code from the bank and opens the banks list', async () => {
    mockParams = { code: 'abc', state: 'state-123.m' };
    mockInvoke.mockResolvedValue({ data: { connectionId: 'c1' }, error: null });
    await render(<BankCallbackScreen />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/integrations/banks'));
    expect(mockInvoke).toHaveBeenCalledTimes(1);
    expect(mockInvoke).toHaveBeenCalledWith('open-banking', {
      method: 'POST',
      body: { action: 'finish', code: 'abc', state: 'state-123.m' },
    });
  });

  it('explains a cancelled authorisation without calling the server', async () => {
    mockParams = { error: 'access_denied', state: 'x' };
    await render(<BankCallbackScreen />);
    expect(await screen.findByText('A autorização foi cancelada no banco.')).toBeOnTheScreen();
    expect(mockInvoke).not.toHaveBeenCalled();
  });
});
