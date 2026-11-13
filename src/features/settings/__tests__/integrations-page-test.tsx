import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/test-utils/render';

import { IntegrationsPage } from '../IntegrationsPage';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  router: { push: (...args: unknown[]) => mockPush(...args) },
  useFocusEffect: (effect: () => void) => jest.requireActual('react').useEffect(effect, [effect]),
}));

// Tabelas simuladas (RLS do servidor fora do teste): nada é lido nem alterado fora daqui.
let mockTables: Record<string, unknown[]> = {};
let mockT212: { integration: unknown; snapshot: unknown } = { integration: null, snapshot: null };
const mockClient = {
  from: (table: string) => ({
    select: () => ({ order: async () => ({ data: mockTables[table] ?? [], error: null }) }),
  }),
};
jest.mock('../../account/AuthProvider', () => ({
  ...jest.requireActual('../../account/AuthProvider'),
  useAuth: () => ({ state: { status: 'signedIn', user: { id: 'u1' } }, client: mockClient }),
}));
jest.mock('../../investments/trading212-sync', () => ({
  ...jest.requireActual('../../investments/trading212-sync'),
  loadT212: async () => mockT212,
}));

const previous = process.env.EXPO_PUBLIC_T212_ENABLED;
beforeEach(() => {
  process.env.EXPO_PUBLIC_T212_ENABLED = 'true';
  mockTables = {};
  mockT212 = { integration: null, snapshot: null };
  mockPush.mockClear();
});
afterAll(() => {
  process.env.EXPO_PUBLIC_T212_ENABLED = previous;
});

describe('Integrations page', () => {
  it('shows each bank connection with its real state and the limited access', async () => {
    mockTables = {
      bank_connections: [
        {
          id: 'c1',
          aspsp_name: 'Revolut',
          aspsp_country: 'PT',
          status: 'connected',
          valid_until: '2027-02-11T00:00:00Z',
          last_sync_at: '2026-11-13T19:42:00Z',
          last_error: null,
        },
        {
          id: 'c2',
          aspsp_name: 'Santander Totta',
          aspsp_country: 'PT',
          status: 'expired',
          valid_until: '2026-11-01T00:00:00Z',
          last_sync_at: null,
          last_error: 'expired',
        },
      ],
      bank_accounts: [{ id: 'a1', connection_id: 'c1' }],
    };
    await renderWithProviders(<IntegrationsPage />);
    expect(await screen.findByText('Revolut')).toBeOnTheScreen();
    expect(screen.getByText('1 banco ligado')).toBeOnTheScreen();
    expect(screen.getByText('Expirado')).toBeOnTheScreen();
    expect(screen.getByText(/1 conta · Atualizado/)).toBeOnTheScreen();
    expect(screen.getByText(/Em validação/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Gerir bancos' }));
    expect(mockPush).toHaveBeenCalledWith('/integrations/banks');
  });

  it('says when no bank is connected and offers to connect one', async () => {
    await renderWithProviders(<IntegrationsPage />);
    expect(await screen.findByText('Nenhum banco ligado.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Ligar um banco' }));
    expect(mockPush).toHaveBeenCalledWith('/integrations/bank-link');
  });

  it('shows the Trading 212 account value from the last snapshot when connected', async () => {
    mockT212 = {
      integration: {
        status: 'connected',
        environment: 'live',
        last_sync_at: '2026-11-13T19:00:00Z',
        last_error: null,
      },
      snapshot: { currency: 'EUR', total: 1234567 },
    };
    await renderWithProviders(<IntegrationsPage />);
    expect(await screen.findByText('Conta real')).toBeOnTheScreen();
    expect(screen.getByText(/12\s?345,67\s?€/)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Abrir Trading 212' })).toBeOnTheScreen();
  });

  it('offers to connect Trading 212 when there is no connection', async () => {
    await renderWithProviders(<IntegrationsPage />);
    expect(await screen.findByText('Não ligada.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Ligar conta' }));
    expect(mockPush).toHaveBeenCalledWith('/integrations/trading212');
  });
});
