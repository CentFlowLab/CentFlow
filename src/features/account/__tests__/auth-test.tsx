import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import type { AuthError, Session, SupabaseClient, User } from '@supabase/supabase-js';
import { Text } from 'react-native';

import { renderWithProviders } from '@/test-utils/render';

import { authRedirectUrl } from '../auth-redirect';
import {
  AuthProvider,
  authLogCode,
  isMissingVerifier,
  toAuthErrorCode,
  useAuth,
} from '../AuthProvider';
import { SignInScreen, SignUpScreen } from '../AuthScreens';

jest.mock('@/features/finance/navigation', () => ({
  closeModal: jest.fn(),
}));

function authError(code: string, status = 400): AuthError {
  return { name: 'AuthApiError', message: code, status, code } as AuthError;
}

describe('authRedirectUrl', () => {
  it('uses the exact public pages whitelisted in Supabase, never miven:/// with three slashes', () => {
    // Os testes correm como nativo (jest-expo, iOS).
    expect(authRedirectUrl('/auth/callback')).toBe('https://miven.pt/auth/callback');
    expect(authRedirectUrl('/auth/reset-password')).toBe('https://miven.pt/auth/reset-password');
  });
});

describe('toAuthErrorCode', () => {
  it('maps known Supabase errors without exposing messages', () => {
    expect(toAuthErrorCode(authError('invalid_credentials'))).toBe('invalidCredentials');
    expect(toAuthErrorCode(authError('email_not_confirmed'))).toBe('emailNotConfirmed');
    expect(toAuthErrorCode(authError('email_address_invalid'))).toBe('emailInvalid');
    expect(toAuthErrorCode(authError('email_address_not_authorized'))).toBe('emailSendFailed');
    expect(
      toAuthErrorCode({
        ...authError('unexpected_failure', 500),
        message: 'Error sending confirmation email',
      }),
    ).toBe('emailSendFailed');
    expect(toAuthErrorCode(authError('unexpected_failure', 500))).toBe('unknown');
    expect(
      toAuthErrorCode({
        ...authError('validation_failed'),
        message: 'redirect url is not allowed',
      }),
    ).toBe('redirectRejected');
    expect(toAuthErrorCode(authError('validation_failed'))).toBe('unknown');
    expect(toAuthErrorCode(authError('email_exists'))).toBe('emailExists');
    expect(toAuthErrorCode(authError('user_already_exists'))).toBe('emailExists');
    expect(toAuthErrorCode(authError('weak_password'))).toBe('weakPassword');
    expect(toAuthErrorCode(authError('over_request_rate_limit'))).toBe('rateLimited');
    expect(toAuthErrorCode(authError('otp_expired'))).toBe('linkInvalid');
    expect(toAuthErrorCode({ name: 'AuthRetryableFetchError', status: 0 } as AuthError)).toBe(
      'network',
    );
    expect(toAuthErrorCode(authError('something_else'))).toBe('unknown');
    expect(
      isMissingVerifier({
        name: 'AuthPKCECodeVerifierMissingError',
        message: 'PKCE code verifier not found in storage.',
      } as AuthError),
    ).toBe(true);
    expect(toAuthErrorCode(authError('otp_expired'))).toBe('linkInvalid');
  });

  it('logs only the error code', () => {
    const error = {
      ...authError('email_address_invalid'),
      message: 'rejected pessoa@exemplo.test',
    };
    expect(authLogCode(error)).toBe('email_address_invalid');
    expect(authLogCode(error)).not.toContain('pessoa@exemplo.test');
    expect(authLogCode({ name: 'AuthRetryableFetchError', status: 0 } as AuthError)).toBe(
      'network',
    );
  });
});

type AuthApi = {
  getSession: jest.Mock;
  onAuthStateChange: jest.Mock;
  signInWithPassword: jest.Mock;
  signUp: jest.Mock;
  signOut: jest.Mock;
  resetPasswordForEmail: jest.Mock;
  exchangeCodeForSession: jest.Mock;
  verifyOtp: jest.Mock;
  updateUser: jest.Mock;
  signInWithIdToken: jest.Mock;
  signInWithOAuth: jest.Mock;
};

function fakeClient(
  overrides: Partial<AuthApi> = {},
  rpc: jest.Mock = jest.fn(async () => ({ data: true, error: null })),
): {
  client: SupabaseClient;
  auth: AuthApi;
} {
  const listeners = new Set<(event: string, session: Session | null) => void>();
  const auth: AuthApi = {
    getSession: jest.fn(async () => ({ data: { session: null } })),
    onAuthStateChange: jest.fn((listener) => {
      listeners.add(listener);
      listener('INITIAL_SESSION', null);
      return { data: { subscription: { unsubscribe: () => listeners.delete(listener) } } };
    }),
    signInWithPassword: jest.fn(async () => ({ error: null })),
    signUp: jest.fn(async () => ({ data: { session: null }, error: null })),
    signOut: jest.fn(async () => ({ error: null })),
    resetPasswordForEmail: jest.fn(async () => ({ error: null })),
    exchangeCodeForSession: jest.fn(async () => ({ error: null })),
    verifyOtp: jest.fn(async () => ({ error: null })),
    updateUser: jest.fn(async () => ({ error: null })),
    signInWithIdToken: jest.fn(async () => ({ error: null })),
    signInWithOAuth: jest.fn(async () => ({ error: null })),
    ...overrides,
  };
  return { client: { auth, rpc } as unknown as SupabaseClient, auth };
}

function StatusProbe() {
  const { state } = useAuth();
  const label =
    state.status === 'signedIn'
      ? `in:${state.user.id}`
      : state.status === 'signedOut' && state.expired
        ? 'expired'
        : state.status;
  return <Text>{label}</Text>;
}

describe('AuthProvider', () => {
  it('starts signed out when there is no session', async () => {
    const { client } = fakeClient();
    await renderWithProviders(
      <AuthProvider client={client}>
        <StatusProbe />
      </AuthProvider>,
    );
    expect(await screen.findByText('signedOut')).toBeOnTheScreen();
  });

  it('restores a persisted session', async () => {
    const user = { id: 'user-1', email: 'a@b.pt' } as User;
    const { client } = fakeClient({
      getSession: jest.fn(async () => ({ data: { session: { user } as Session } })),
    });
    await renderWithProviders(
      <AuthProvider client={client}>
        <StatusProbe />
      </AuthProvider>,
    );
    expect(await screen.findByText('in:user-1')).toBeOnTheScreen();
  });
});

describe('auth screens', () => {
  it('signs in with email and password', async () => {
    const { client, auth } = fakeClient();
    await renderWithProviders(
      <AuthProvider client={client}>
        <SignInScreen />
      </AuthProvider>,
    );
    await fireEvent.changeText(await screen.findByLabelText('Email'), 'a@b.pt');
    await fireEvent.changeText(screen.getByLabelText('Palavra-passe'), 'secret-password');
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));
    await waitFor(() =>
      expect(auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'a@b.pt',
        password: 'secret-password',
      }),
    );
  });

  it('shows a translated error instead of the server message', async () => {
    const { client, auth } = fakeClient({
      signInWithPassword: jest.fn(async () => ({
        error: authError('invalid_credentials'),
      })),
    });
    await renderWithProviders(
      <AuthProvider client={client}>
        <SignInScreen />
      </AuthProvider>,
    );
    await fireEvent.changeText(await screen.findByLabelText('Email'), 'a@b.pt');
    await fireEvent.changeText(screen.getByLabelText('Palavra-passe'), 'wrong');
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText('Email ou palavra-passe incorretos.')).toBeOnTheScreen();
    expect(auth.signInWithPassword).toHaveBeenCalled();
  });

  it('says the user was not found when the email has no account', async () => {
    const { client } = fakeClient(
      {
        signInWithPassword: jest.fn(async () => ({
          error: authError('invalid_credentials'),
        })),
      },
      jest.fn(async () => ({ data: false, error: null })),
    );
    await renderWithProviders(
      <AuthProvider client={client}>
        <SignInScreen />
      </AuthProvider>,
    );
    await fireEvent.changeText(await screen.findByLabelText('Email'), 'apagada@b.pt');
    await fireEvent.changeText(screen.getByLabelText('Palavra-passe'), 'wrong');
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText('Utilizador não encontrado.')).toBeOnTheScreen();
  });

  it('lets the password be shown', async () => {
    const { client } = fakeClient();
    await renderWithProviders(
      <AuthProvider client={client}>
        <SignInScreen />
      </AuthProvider>,
    );
    expect(await screen.findByRole('button', { name: 'Mostrar palavra-passe' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Mostrar palavra-passe' }));
    expect(screen.getByRole('button', { name: 'Esconder palavra-passe' })).toBeOnTheScreen();
  });

  it('validates the email before calling the server', async () => {
    const { client, auth } = fakeClient();
    await renderWithProviders(
      <AuthProvider client={client}>
        <SignInScreen />
      </AuthProvider>,
    );
    await fireEvent.changeText(await screen.findByLabelText('Email'), 'nao-e-email');
    await fireEvent.changeText(screen.getByLabelText('Palavra-passe'), 'secret-password');
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText('Indica um email válido.')).toBeOnTheScreen();
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('asks to confirm the email after sign-up without a session', async () => {
    const { client, auth } = fakeClient();
    await renderWithProviders(
      <AuthProvider client={client}>
        <SignUpScreen />
      </AuthProvider>,
    );
    await fireEvent.changeText(await screen.findByLabelText('Nome de utilizador'), 'Manu');
    await fireEvent.changeText(screen.getByLabelText('Email'), 'nova@b.pt');
    await fireEvent.changeText(screen.getByLabelText('Palavra-passe'), 'secret-password');
    await fireEvent.press(screen.getByRole('button', { name: 'Criar conta' }));
    await waitFor(() =>
      expect(auth.signUp).toHaveBeenCalledWith({
        email: 'nova@b.pt',
        password: 'secret-password',
        options: {
          emailRedirectTo: 'https://miven.pt/auth/callback',
          data: { locale: 'pt', username: 'Manu' },
        },
      }),
    );
    expect(await screen.findByText('Confirma o teu email')).toBeOnTheScreen();
  });

  it('explains a rejected sign-up and logs only the error code', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const { client } = fakeClient({
      signUp: jest.fn(async () => ({
        data: { session: null, user: null },
        error: {
          name: 'AuthApiError',
          status: 400,
          code: 'email_address_invalid',
          message: 'rejected nova@b.pt',
        },
      })),
    });
    await renderWithProviders(
      <AuthProvider client={client}>
        <SignUpScreen />
      </AuthProvider>,
    );
    await fireEvent.changeText(await screen.findByLabelText('Nome de utilizador'), 'Manu');
    await fireEvent.changeText(screen.getByLabelText('Email'), 'nova@b.pt');
    await fireEvent.changeText(screen.getByLabelText('Palavra-passe'), 'secret-password');
    await fireEvent.press(screen.getByRole('button', { name: 'Criar conta' }));
    expect(
      await screen.findByText(
        'Este email não é aceite. Domínios de exemplo ou de teste não servem; usa um endereço real.',
      ),
    ).toBeOnTheScreen();
    const logged = spy.mock.calls.flat().join(' ');
    expect(logged).toContain('[auth] email_address_invalid');
    expect(logged).not.toContain('nova@b.pt');
    spy.mockRestore();
  });
});
