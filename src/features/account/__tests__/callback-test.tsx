import { screen, waitFor } from '@testing-library/react-native';
import type { SupabaseClient } from '@supabase/supabase-js';

import { renderWithProviders } from '@/test-utils/render';

import { AuthProvider } from '../AuthProvider';
import { AuthCallbackScreen } from '../AuthScreens';

const mockReplace = jest.fn();
let mockFailure: 'ignore' | 'reload' | 'explain' = 'explain';

jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  router: { replace: (...args: unknown[]) => mockReplace(...args) },
  useLocalSearchParams: () => ({ token_hash: 'hash-123', type: 'email' }),
}));

jest.mock('@/features/finance/navigation', () => ({ closeModal: jest.fn() }));

jest.mock('../../app-shell/web-isolation', () => ({
  isolationFailure: () => mockFailure,
  readIsolationEnv: () => ({}),
  copyAppAddress: jest.fn(async () => true),
}));

function fakeClient() {
  const auth = {
    getSession: jest.fn(async () => ({ data: { session: null } })),
    onAuthStateChange: jest.fn((listener: (event: string, session: null) => void) => {
      listener('INITIAL_SESSION', null);
      return { data: { subscription: { unsubscribe: () => undefined } } };
    }),
    verifyOtp: jest.fn(async () => ({ error: null })),
    exchangeCodeForSession: jest.fn(async () => ({ error: null })),
  };
  return { client: { auth, rpc: jest.fn() } as unknown as SupabaseClient, auth };
}

describe('AuthCallbackScreen', () => {
  beforeEach(() => {
    mockReplace.mockClear();
  });

  it('confirms the email and says where to continue in a browser that cannot store data', async () => {
    mockFailure = 'explain';
    const { client, auth } = fakeClient();
    await renderWithProviders(
      <AuthProvider client={client}>
        <AuthCallbackScreen />
      </AuthProvider>,
    );
    await waitFor(() =>
      expect(auth.verifyOtp).toHaveBeenCalledWith({ token_hash: 'hash-123', type: 'email' }),
    );
    expect(await screen.findByText('Email confirmado')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Copiar endereço da app' })).toBeOnTheScreen();
    expect(mockReplace).not.toHaveBeenCalledWith('/');
  });

  it('does not show that screen where the app can run', async () => {
    mockFailure = 'ignore';
    const { client, auth } = fakeClient();
    await renderWithProviders(
      <AuthProvider client={client}>
        <AuthCallbackScreen />
      </AuthProvider>,
    );
    await waitFor(() => expect(auth.verifyOtp).toHaveBeenCalled());
    expect(screen.queryByText('Copiar endereço da app')).toBeNull();
  });
});
