import { fireEvent, screen } from '@testing-library/react-native';
import type { Session, SupabaseClient, User } from '@supabase/supabase-js';

import { renderWithProviders } from '@/test-utils/render';

import { AccountSettingsPage, SyncStatusGroup } from '../AccountSettings';
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
  return {
    client: {
      auth,
      rpc: jest.fn(async () => ({ data: null, error: null })),
    } as unknown as SupabaseClient,
    auth,
  };
}

describe('Account settings page', () => {
  it('separates profile, password, session and, last, account management', async () => {
    const { client } = signedInClient();
    await renderWithProviders(
      <AuthProvider client={client}>
        <AccountSettingsPage />
      </AuthProvider>,
    );
    expect(await screen.findByText('@ana.silva')).toBeOnTheScreen();
    expect(screen.getByText('ana@exemplo.pt')).toBeOnTheScreen();

    const order = screen
      .getAllByRole('header')
      .map((node) => node.props.children as string)
      .filter((text) => typeof text === 'string');
    expect(order).toEqual([
      'Conta e segurança',
      'Perfil',
      'Palavra-passe e acesso',
      'Sessão',
      'Gestão da conta',
    ]);

    // Sem "Zona de perigo" e sem eliminar conta em destaque nas Definições.
    expect(screen.queryByText('Zona de perigo')).toBeNull();
    expect(screen.queryByText('Eliminar conta')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: /^Gerir conta/ }));
    expect(mockPush).toHaveBeenCalledWith('/account-management');
  });

  it('signs out from the session group', async () => {
    const { client, auth } = signedInClient();
    await renderWithProviders(
      <AuthProvider client={client}>
        <AccountSettingsPage />
      </AuthProvider>,
    );
    await fireEvent.press(await screen.findByRole('button', { name: 'Terminar sessão' }));
    expect(auth.signOut).toHaveBeenCalled();
  });

  it('syncs on request and says when it is done', async () => {
    const { client } = signedInClient();
    await renderWithProviders(
      <AuthProvider client={client}>
        <SyncStatusGroup />
      </AuthProvider>,
    );
    expect(await screen.findByText('Sincronizado')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Sincronizar agora' }));
    expect(mockSyncNow).toHaveBeenCalled();
    expect(await screen.findByText('Sincronização concluída.')).toBeOnTheScreen();
  });
});
