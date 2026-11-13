import { fireEvent, screen } from '@testing-library/react-native';
import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import { Text } from 'react-native';

import { renderWithProviders } from '@/test-utils/render';

import { AccountSettings } from '../AccountSection';
import { AuthProvider } from '../AuthProvider';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  router: { push: (...args: unknown[]) => mockPush(...args) },
}));

const mockSyncNow = jest.fn(async () => ({ status: 'idle', pending: 0 }));

// Objetos estáveis entre renders, como os dos providers reais.
const mockSpace = { space: { kind: 'user', userId: 'user-1' }, store: {} };
const mockSync = {
  snapshot: { status: 'idle', pending: 0, conflicts: 0, lastSyncedAt: null },
  syncNow: (...args: unknown[]) => mockSyncNow(...(args as [])),
  offerImport: () => undefined,
};

jest.mock('../../app-shell/DataGate', () => ({ useActiveSpace: () => mockSpace }));
jest.mock('../SyncProvider', () => ({ useSync: () => mockSync }));

jest.mock('@/data', () => ({
  ...jest.requireActual('@/data'),
  getImportState: jest.fn(async () => ({ state: 'none' })),
  cancelImport: jest.fn(),
}));

function signedInClient() {
  const user = {
    id: 'user-1',
    email: 'ana@exemplo.pt',
    user_metadata: { username: 'ana.silva' },
  } as unknown as User;
  const session = { user } as Session;
  const auth = {
    getSession: jest.fn(async () => ({ data: { session } })),
    getUser: jest.fn(async () => ({ data: { user } })),
    onAuthStateChange: jest.fn((listener: (event: string, value: Session | null) => void) => {
      listener('INITIAL_SESSION', session);
      return { data: { subscription: { unsubscribe: () => undefined } } };
    }),
    signOut: jest.fn(async () => ({ error: null })),
    resetPasswordForEmail: jest.fn(async () => ({ error: null })),
  };
  return { client: { auth, rpc: jest.fn() } as unknown as SupabaseClient, auth };
}

describe('AccountSettings', () => {
  it('keeps account management in the account card, with no danger zone', async () => {
    const { client } = signedInClient();
    await renderWithProviders(
      <AuthProvider client={client}>
        <AccountSettings>
          <Text>meio</Text>
        </AccountSettings>
      </AuthProvider>,
    );
    expect(await screen.findByText('@ana.silva')).toBeOnTheScreen();
    expect(screen.getByText('ana@exemplo.pt')).toBeOnTheScreen();

    const order = screen
      .getAllByText(/^(Conta|Sincronização|meio)$/)
      .map((node) => node.props.children as string);
    expect(order).toEqual(['Conta', 'Sincronização', 'meio']);

    // Sem "Zona de perigo" e sem eliminar conta em destaque nas Definições.
    expect(screen.queryByText('Zona de perigo')).toBeNull();
    expect(screen.queryByText('Eliminar conta')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: /^Gerir conta/ }));
    expect(mockPush).toHaveBeenCalledWith('/account-management');
  });

  it('syncs from the status row and signs out from the account card', async () => {
    const { client, auth } = signedInClient();
    await renderWithProviders(
      <AuthProvider client={client}>
        <AccountSettings>{null}</AccountSettings>
      </AuthProvider>,
    );
    await fireEvent.press(await screen.findByRole('button', { name: /^Sincronizado/ }));
    expect(mockSyncNow).toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Terminar sessão' }));
    expect(auth.signOut).toHaveBeenCalled();
  });
});
