import { renderRouter, screen } from 'expo-router/testing-library';

import { openLocalSpace } from '@/data/open-app-database';
import { getSupabase } from '@/lib/supabase';

import { appAccessFor } from '../app-access';

describe('appAccessFor', () => {
  it('only grants access with a session', () => {
    const user = { id: '00000000-0000-4000-8000-000000000001', email: null };
    expect(appAccessFor({ status: 'signedIn', user }, false)).toBe('granted');
    expect(appAccessFor({ status: 'signedOut', expired: false }, true)).toBe('signedOut');
    expect(appAccessFor({ status: 'loading' }, false)).toBe('loading');
  });

  it('never allows use without an account in a production build', () => {
    expect(appAccessFor({ status: 'unavailable' }, false)).toBe('misconfigured');
    expect(appAccessFor({ status: 'unavailable' }, true)).toBe('granted');
  });
});

/** Cliente mínimo sem sessão: só o que o AuthProvider lê ao arrancar. */
function signedOutClient() {
  return {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
    },
  };
}

describe('without a session', () => {
  beforeEach(() => {
    jest.mocked(getSupabase).mockReturnValue(signedOutClient() as never);
    jest.mocked(openLocalSpace).mockClear();
  });

  afterEach(() => {
    jest.mocked(getSupabase).mockReturnValue(null);
  });

  it('shows the welcome screen and opens no local data', async () => {
    await renderRouter('./src/app', { initialUrl: '/' });
    expect(await screen.findByText('Bem-vindo ao Miven')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Criar conta' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Já tenho conta' })).toBeOnTheScreen();
    expect(openLocalSpace).not.toHaveBeenCalled();
  });

  it('does not open data screens by URL', async () => {
    await renderRouter('./src/app', { initialUrl: '/transactions' });
    expect(await screen.findByText('Bem-vindo ao Miven')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Pesquisar')).toBeNull();
    expect(openLocalSpace).not.toHaveBeenCalled();
  });
});
