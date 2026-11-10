import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import type { AuthError, Session, SupabaseClient, User } from '@supabase/supabase-js';
import type { ReactNode } from 'react';
import { Text } from 'react-native';

import { renderWithProviders } from '@/test-utils/render';

import { ageOn } from '../age';
import { authRedirectUrl } from '../auth-redirect';
import {
  AuthProvider,
  authLogCode,
  isMissingVerifier,
  toAuthErrorCode,
  useAuth,
} from '../AuthProvider';
import { shouldWaitForIsolation, SignInScreen, SignUpScreen } from '../AuthScreens';
import { ConfirmEmailScreen } from '../ConfirmEmailScreen';

jest.mock('@/features/finance/navigation', () => ({
  closeModal: jest.fn(),
}));

function authError(code: string, status = 400): AuthError {
  return { name: 'AuthApiError', message: code, status, code } as AuthError;
}

async function fillBirthDate(day: string, month: string, year: string) {
  await fireEvent.changeText(screen.getByLabelText('Data de nascimento: Dia'), day);
  await fireEvent.changeText(screen.getByLabelText('Data de nascimento: Mês'), month);
  await fireEvent.changeText(screen.getByLabelText('Data de nascimento: Ano'), year);
}

describe('ageOn', () => {
  it('counts full years only', () => {
    expect(ageOn('2010-11-10', '2026-11-10')).toBe(16);
    expect(ageOn('2010-11-11', '2026-11-10')).toBe(15);
    expect(ageOn('2010-12-01', '2026-11-10')).toBe(15);
    expect(ageOn('2000-02-29', '2026-03-01')).toBe(26);
  });
});

describe('shouldWaitForIsolation', () => {
  const site = {
    web: true,
    isolated: false,
    workerScript: true,
    serviceWorkers: true,
    secure: true,
  };

  it('waits for the service worker reload only where it can happen', () => {
    expect(shouldWaitForIsolation(site)).toBe(true);
    expect(shouldWaitForIsolation({ ...site, isolated: true })).toBe(false);
    expect(shouldWaitForIsolation({ ...site, web: false })).toBe(false);
    expect(shouldWaitForIsolation({ ...site, workerScript: false })).toBe(false);
  });

  it('does not wait in iPhone browsers without service workers (Brave, Chrome, Mail)', () => {
    expect(shouldWaitForIsolation({ ...site, serviceWorkers: false })).toBe(false);
    expect(shouldWaitForIsolation({ ...site, secure: false })).toBe(false);
  });
});

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
        code: 'pkce_code_verifier_not_found',
      } as AuthError),
    ).toBe(true);
    expect(toAuthErrorCode(authError('pkce_code_verifier_not_found'))).toBe('confirmedElsewhere');
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
  resend: jest.Mock;
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
    resend: jest.fn(async () => ({ error: null })),
    ...overrides,
  };
  return { client: { auth, rpc } as unknown as SupabaseClient, auth };
}

/** Como o `AccountGate`: com uma conta à espera, só o ecrã de confirmação. */
function PendingGate({ children }: { children: ReactNode }) {
  const { pending } = useAuth();
  return pending ? <ConfirmEmailScreen pending={pending} /> : children;
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
    await fireEvent.changeText(
      await screen.findByLabelText('Email ou nome de utilizador'),
      'a@b.pt',
    );
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
    await fireEvent.changeText(
      await screen.findByLabelText('Email ou nome de utilizador'),
      'a@b.pt',
    );
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
    await fireEvent.changeText(
      await screen.findByLabelText('Email ou nome de utilizador'),
      'apagada@b.pt',
    );
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
    await fireEvent.changeText(
      await screen.findByLabelText('Email ou nome de utilizador'),
      'nao@email',
    );
    await fireEvent.changeText(screen.getByLabelText('Palavra-passe'), 'secret-password');
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText('Indica um email válido.')).toBeOnTheScreen();
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('asks to confirm the email after sign-up without a session', async () => {
    const { client, auth } = fakeClient();
    await renderWithProviders(
      <AuthProvider client={client}>
        <PendingGate>
          <SignUpScreen />
        </PendingGate>
      </AuthProvider>,
    );
    await fireEvent.changeText(await screen.findByLabelText('Nome de utilizador'), 'Manu.Silva');
    await fillBirthDate('12', '04', '1995');
    await fireEvent.changeText(screen.getByLabelText('Email'), 'nova@b.pt');
    await fireEvent.changeText(screen.getByLabelText('Palavra-passe'), 'secret-password');
    await fireEvent.press(screen.getByRole('button', { name: 'Criar conta' }));
    await waitFor(() =>
      expect(auth.signUp).toHaveBeenCalledWith({
        email: 'nova@b.pt',
        password: 'secret-password',
        options: {
          emailRedirectTo: 'https://miven.pt/auth/callback',
          data: { locale: 'pt', username: 'manu.silva', birth_date: '1995-04-12' },
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
    await fireEvent.changeText(await screen.findByLabelText('Nome de utilizador'), 'Manu.Silva');
    await fillBirthDate('12', '04', '1995');
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
  it('signs in with a username: the server returns the email only with the right password', async () => {
    const rpc = jest.fn(async (fn: string) =>
      fn === 'login_email' ? { data: 'manu@b.pt', error: null } : { data: true, error: null },
    );
    const { client, auth } = fakeClient({}, rpc);
    await renderWithProviders(
      <AuthProvider client={client}>
        <SignInScreen />
      </AuthProvider>,
    );
    await fireEvent.changeText(
      await screen.findByLabelText('Email ou nome de utilizador'),
      'Manu.Silva',
    );
    await fireEvent.changeText(screen.getByLabelText('Palavra-passe'), 'secret-password');
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));
    await waitFor(() =>
      expect(auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'manu@b.pt',
        password: 'secret-password',
      }),
    );
    expect(rpc).toHaveBeenCalledWith('login_email', {
      target_username: 'manu.silva',
      target_password: 'secret-password',
    });
  });

  it('does not say whether the username or the password was wrong', async () => {
    const rpc = jest.fn(async () => ({ data: null, error: null }));
    const { client, auth } = fakeClient({}, rpc);
    await renderWithProviders(
      <AuthProvider client={client}>
        <SignInScreen />
      </AuthProvider>,
    );
    await fireEvent.changeText(
      await screen.findByLabelText('Email ou nome de utilizador'),
      'manu.silva',
    );
    await fireEvent.changeText(screen.getByLabelText('Palavra-passe'), 'errada');
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));
    expect(
      await screen.findByText('Nome de utilizador ou palavra-passe incorretos.'),
    ).toBeOnTheScreen();
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('refuses sign-up under the minimum age', async () => {
    const { client, auth } = fakeClient();
    await renderWithProviders(
      <AuthProvider client={client}>
        <SignUpScreen />
      </AuthProvider>,
    );
    await fireEvent.changeText(await screen.findByLabelText('Nome de utilizador'), 'jovem');
    await fillBirthDate('01', '01', '2020');
    await fireEvent.changeText(screen.getByLabelText('Email'), 'jovem@b.pt');
    await fireEvent.changeText(screen.getByLabelText('Palavra-passe'), 'secret-password');
    await fireEvent.press(screen.getByRole('button', { name: 'Criar conta' }));
    expect(
      await screen.findByText('Tens de ter pelo menos 16 anos para criar conta.'),
    ).toBeOnTheScreen();
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it('says when the username is taken before creating the account', async () => {
    const rpc = jest.fn(async () => ({ data: false, error: null }));
    const { client, auth } = fakeClient({}, rpc);
    await renderWithProviders(
      <AuthProvider client={client}>
        <SignUpScreen />
      </AuthProvider>,
    );
    await fireEvent.changeText(await screen.findByLabelText('Nome de utilizador'), 'ocupado');
    await fillBirthDate('12', '04', '1995');
    await fireEvent.changeText(screen.getByLabelText('Email'), 'nova@b.pt');
    await fireEvent.changeText(screen.getByLabelText('Palavra-passe'), 'secret-password');
    await fireEvent.press(screen.getByRole('button', { name: 'Criar conta' }));
    expect(
      await screen.findByText('Este nome de utilizador já está em uso. Escolhe outro.'),
    ).toBeOnTheScreen();
    expect(auth.signUp).not.toHaveBeenCalled();
  });
  it('keeps a new account on the confirmation screen, with resend after the cooldown', async () => {
    const { client, auth } = fakeClient();
    await renderWithProviders(
      <AuthProvider client={client}>
        <PendingGate>
          <SignUpScreen />
        </PendingGate>
      </AuthProvider>,
    );
    await fireEvent.changeText(await screen.findByLabelText('Nome de utilizador'), 'nova.conta');
    await fillBirthDate('12', '04', '1995');
    await fireEvent.changeText(screen.getByLabelText('Email'), 'nova@b.pt');
    await fireEvent.changeText(screen.getByLabelText('Palavra-passe'), 'secret-password');
    await fireEvent.press(screen.getByRole('button', { name: 'Criar conta' }));
    expect(await screen.findByText('Confirma o teu email')).toBeOnTheScreen();
    expect(screen.getByText('nova@b.pt')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Criar conta' })).toBeNull();
    // O email acabou de ser enviado: reenviar só depois de 60 s.
    expect(screen.getByRole('button', { name: /Reenviar dentro de 60/ })).toBeDisabled();
    expect(auth.resend).not.toHaveBeenCalled();
  });

  it('opens the confirmation screen when sign-in says the email is not confirmed', async () => {
    const { client, auth } = fakeClient({
      signInWithPassword: jest.fn(async () => ({ error: authError('email_not_confirmed') })),
    });
    await renderWithProviders(
      <AuthProvider client={client}>
        <PendingGate>
          <SignInScreen />
        </PendingGate>
      </AuthProvider>,
    );
    await fireEvent.changeText(
      await screen.findByLabelText('Email ou nome de utilizador'),
      'nova@b.pt',
    );
    await fireEvent.changeText(screen.getByLabelText('Palavra-passe'), 'secret-password');
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText('Confirma o teu email')).toBeOnTheScreen();
    expect(screen.getByText('Não recebeste o email?')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Reenviar email' }));
    await waitFor(() =>
      expect(auth.resend).toHaveBeenCalledWith({
        type: 'signup',
        email: 'nova@b.pt',
        options: { emailRedirectTo: 'https://miven.pt/auth/callback' },
      }),
    );
    expect(await screen.findByText(/Enviámos um novo link/)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /Reenviar dentro de/ })).toBeDisabled();
  });

  it('uses the email behind a username for the confirmation screen', async () => {
    const rpc = jest.fn(async () => ({ data: 'nova@b.pt', error: null }));
    const { client, auth } = fakeClient(
      { signInWithPassword: jest.fn(async () => ({ error: authError('email_not_confirmed') })) },
      rpc,
    );
    await renderWithProviders(
      <AuthProvider client={client}>
        <PendingGate>
          <SignInScreen />
        </PendingGate>
      </AuthProvider>,
    );
    await fireEvent.changeText(
      await screen.findByLabelText('Email ou nome de utilizador'),
      'nova.conta',
    );
    await fireEvent.changeText(screen.getByLabelText('Palavra-passe'), 'secret-password');
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText('nova@b.pt')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Reenviar email' }));
    await waitFor(() =>
      expect(auth.resend).toHaveBeenCalledWith(expect.objectContaining({ email: 'nova@b.pt' })),
    );
  });

  it('signs in from the confirmation screen once the email is confirmed', async () => {
    const signInWithPassword = jest
      .fn()
      .mockResolvedValueOnce({ error: authError('email_not_confirmed') })
      .mockResolvedValueOnce({ error: authError('email_not_confirmed') })
      .mockResolvedValue({ error: null });
    const { client, auth } = fakeClient({ signInWithPassword });
    await renderWithProviders(
      <AuthProvider client={client}>
        <PendingGate>
          <SignInScreen />
        </PendingGate>
      </AuthProvider>,
    );
    await fireEvent.changeText(
      await screen.findByLabelText('Email ou nome de utilizador'),
      'nova@b.pt',
    );
    await fireEvent.changeText(screen.getByLabelText('Palavra-passe'), 'secret-password');
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Já confirmei' }));
    expect(await screen.findByText(/Ainda não está confirmado/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Já confirmei' }));
    await waitFor(() => expect(screen.queryByText('Confirma o teu email')).toBeNull());
    expect(auth.signInWithPassword).toHaveBeenLastCalledWith({
      email: 'nova@b.pt',
      password: 'secret-password',
    });
  });

  it('lets the person leave the confirmation screen to use another account', async () => {
    const { client } = fakeClient({
      signInWithPassword: jest.fn(async () => ({ error: authError('email_not_confirmed') })),
    });
    await renderWithProviders(
      <AuthProvider client={client}>
        <PendingGate>
          <SignInScreen />
        </PendingGate>
      </AuthProvider>,
    );
    await fireEvent.changeText(
      await screen.findByLabelText('Email ou nome de utilizador'),
      'nova@b.pt',
    );
    await fireEvent.changeText(screen.getByLabelText('Palavra-passe'), 'secret-password');
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Usar outra conta' }));
    expect(await screen.findByRole('button', { name: 'Entrar' })).toBeOnTheScreen();
    expect(screen.queryByText(/Confirma primeiro/)).toBeNull();
  });
});
