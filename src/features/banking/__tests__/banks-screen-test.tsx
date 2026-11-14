import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { RepositoriesProvider, type Repositories } from '@/data';
import { openTestRepositories } from '@/test-utils/node-sqlite-driver';
import { renderWithProviders } from '@/test-utils/render';

import { BankAccountLinkScreen } from '../BankAccountLinkScreen';
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
  rpc: jest.fn(async (): Promise<{ error: unknown }> => ({ error: null })),
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
  mockClient.rpc.mockReset();
  mockClient.rpc.mockResolvedValue({ error: null });
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

  const bankRow = (id: string, appAccount: string | null) => ({
    id,
    connection_id: 'c1',
    name: 'Conta à ordem',
    kind: null,
    iban_last4: '0744',
    currency: 'EUR',
    balance: 5000,
    balance_at: null,
    app_account_id: appAccount,
    import_from: null,
  });
  const linkTables = (accounts: unknown[]) => ({
    bank_connections: [
      {
        id: 'c1',
        aspsp_name: 'Crédito Agrícola',
        aspsp_country: 'PT',
        status: 'connected',
        valid_until: '2027-02-10T00:00:00Z',
        last_sync_at: null,
        last_error: null,
      },
    ],
    bank_accounts: accounts,
  });

  it('creates one new account even when the server only accepts it after syncing', async () => {
    mockParams = { id: 'a1' };
    mockTables = linkTables([bankRow('a1', null)]);
    // 1.ª tentativa: o servidor ainda não tem a conta nova; depois de sincronizar aceita.
    mockClient.rpc
      .mockResolvedValueOnce({ error: { code: '22023' } } as never)
      .mockResolvedValueOnce({ error: null });
    await render(<BankAccountLinkScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: /^Criar conta nova/ }));
    await waitFor(() => expect(mockClient.rpc).toHaveBeenCalledTimes(2));
    expect(screen.queryByText(/Não foi possível associar/)).toBeNull();
    expect(await repos.accounts.list()).toHaveLength(1);
  });

  it('retrying after a failure reuses the account it already created', async () => {
    mockParams = { id: 'a1' };
    mockTables = linkTables([bankRow('a1', null)]);
    mockClient.rpc.mockResolvedValue({ error: { code: '22023' } } as never);
    await render(<BankAccountLinkScreen />);
    const create = await screen.findByRole('button', { name: /^Criar conta nova/ });
    await fireEvent.press(create);
    await waitFor(() => expect(mockClient.rpc).toHaveBeenCalledTimes(2));
    await fireEvent.press(screen.getByRole('button', { name: /^Criar conta nova/ }));
    await waitFor(() => expect(mockClient.rpc).toHaveBeenCalledTimes(4));
    expect(await repos.accounts.list()).toHaveLength(1);
  });

  it('offers neither a new account once linked nor accounts fed by another bank account', async () => {
    const mine = await repos.accounts.create({
      name: 'Minha',
      type: 'bank',
      currency: 'EUR',
      initialBalance: 0,
    });
    const other = await repos.accounts.create({
      name: 'Outra',
      type: 'bank',
      currency: 'EUR',
      initialBalance: 0,
    });
    const free = await repos.accounts.create({
      name: 'Livre',
      type: 'bank',
      currency: 'EUR',
      initialBalance: 0,
    });
    mockParams = { id: 'a1' };
    mockTables = linkTables([bankRow('a1', mine.id), bankRow('a2', other.id)]);
    await render(<BankAccountLinkScreen />);
    expect(await screen.findByText('Minha')).toBeOnTheScreen();
    expect(screen.getByText(free.name)).toBeOnTheScreen();
    expect(screen.queryByText('Outra')).toBeNull();
    expect(screen.queryByText('Criar conta nova')).toBeNull();
  });

  it('suggests the bank and account kind as the name, editable, and picks the account type', async () => {
    mockParams = { id: 'a1' };
    mockTables = linkTables([{ ...bankRow('a1', null), kind: 'card' }]);
    await render(<BankAccountLinkScreen />);
    const field = await screen.findByLabelText('Nome da conta nova');
    expect(field.props.value).toBe('Crédito Agrícola Cartão de crédito');
    await fireEvent.changeText(field, 'Moey Cartão');
    await fireEvent.press(screen.getByRole('button', { name: /^Criar conta nova/ }));
    await waitFor(() => expect(mockClient.rpc).toHaveBeenCalled());
    const [created] = await repos.accounts.list();
    expect(created?.name).toBe('Moey Cartão');
    expect(created?.type).toBe('card');
  });

  it('adjusts the app balance to the bank, or to the debt a card shows as positive', async () => {
    const app = await repos.accounts.create({
      name: 'Unicre',
      type: 'card',
      currency: 'EUR',
      initialBalance: 60000,
    });
    mockParams = { id: 'a1' };
    mockTables = linkTables([{ ...bankRow('a1', app.id), balance: 387046 }]);
    await render(<BankAccountLinkScreen />);
    await fireEvent.press(
      await screen.findByRole('button', { name: /^É dívida: acertar para -3870,46\s?€/ }),
    );
    await waitFor(async () =>
      expect((await repos.accounts.get(app.id))?.initialBalance).toBe(-387046),
    );
    await waitFor(() => expect(screen.queryByText('Saldo na app')).toBeNull());
  });

  it('aligns an existing account to the bank balance when linking it', async () => {
    const app = await repos.accounts.create({
      name: 'Santander',
      type: 'bank',
      currency: 'EUR',
      initialBalance: 60000,
    });
    mockParams = { id: 'a1' };
    mockTables = linkTables([{ ...bankRow('a1', null), balance: 0 }]);
    await render(<BankAccountLinkScreen />);
    await fireEvent.press(await screen.findByRole('radio', { name: /^Santander/ }));
    await waitFor(async () =>
      expect((await repos.accounts.listWithBalances()).find((a) => a.id === app.id)?.balance).toBe(
        0,
      ),
    );
    expect(mockClient.rpc).toHaveBeenCalledWith('bank_account_link', expect.anything());
  });

  it('takes a positive bank balance as debt when the app account is a card', async () => {
    const card = await repos.accounts.create({
      name: 'Unicre',
      type: 'card',
      currency: 'EUR',
      initialBalance: -389657,
    });
    mockParams = { id: 'a1' };
    mockTables = linkTables([{ ...bankRow('a1', null), balance: 387046 }]);
    await render(<BankAccountLinkScreen />);
    await fireEvent.press(await screen.findByRole('radio', { name: /^Unicre/ }));
    await waitFor(async () =>
      expect((await repos.accounts.listWithBalances()).find((a) => a.id === card.id)?.balance).toBe(
        -387046,
      ),
    );
  });

  it('explains a cancelled authorisation without calling the server', async () => {
    mockParams = { error: 'access_denied', state: 'x' };
    await render(<BankCallbackScreen />);
    expect(await screen.findByText('A autorização foi cancelada no banco.')).toBeOnTheScreen();
    expect(mockInvoke).not.toHaveBeenCalled();
  });
});
