import type { AuthError, SupabaseClient } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';

import { getSupabase } from '@/lib/supabase';

import { AppleSignInCancelledError, performAppleSignIn } from './apple-sign-in';
import { authRedirectUrl } from './auth-redirect';

export { authRedirectUrl } from './auth-redirect';

export type AuthUser = { id: string; email: string | null };

export type AuthState =
  /** Projeto Supabase não configurado nesta build: só uso sem conta. */
  | { status: 'unavailable' }
  | { status: 'loading' }
  /** `expired`: a sessão terminou sem o utilizador sair (ex.: refresh token revogado). */
  | { status: 'signedOut'; expired: boolean }
  | { status: 'signedIn'; user: AuthUser };

export type AuthErrorCode =
  | 'invalidCredentials'
  | 'emailNotConfirmed'
  | 'weakPassword'
  | 'rateLimited'
  | 'network'
  | 'linkInvalid'
  | 'unknown';

export type AuthResult<T = void> = { ok: true; value: T } | { ok: false; error: AuthErrorCode };

/** Traduz o erro do Supabase num código. A mensagem nunca é mostrada nem registada. */
export function toAuthErrorCode(error: AuthError | Error | null | undefined): AuthErrorCode {
  if (!error) return 'unknown';
  const { code, status, name } = error as AuthError;
  if (name === 'AuthRetryableFetchError' || status === 0) return 'network';
  switch (code) {
    case 'invalid_credentials':
      return 'invalidCredentials';
    case 'email_not_confirmed':
      return 'emailNotConfirmed';
    case 'weak_password':
      return 'weakPassword';
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return 'rateLimited';
    case 'flow_state_not_found':
    case 'flow_state_expired':
    case 'otp_expired':
    case 'bad_code_verifier':
      return 'linkInvalid';
    default:
      return 'unknown';
  }
}

const ok = <T,>(value: T): AuthResult<T> => ({ ok: true, value });
const fail = (error: AuthError | Error | null | undefined): AuthResult<never> => ({
  ok: false,
  error: toAuthErrorCode(error),
});

export { isAppleSignInAvailable } from './apple-sign-in';

export type AuthActions = {
  signIn(email: string, password: string): Promise<AuthResult>;
  /** `confirmEmail`: conta criada, à espera da confirmação por email. */
  signUp(email: string, password: string): Promise<AuthResult<'signedIn' | 'confirmEmail'>>;
  signOut(): Promise<AuthResult>;
  requestPasswordReset(email: string): Promise<AuthResult>;
  /** Troca o código de um link de email por uma sessão (PKCE). */
  exchangeCode(code: string): Promise<AuthResult>;
  updatePassword(password: string): Promise<AuthResult>;
  signInWithApple(): Promise<AuthResult>;
  /**
   * Volta a autenticar com a Apple antes de eliminar a conta.
   * Cancelar não conta como sucesso.
   */
  reauthenticateWithApple(): Promise<AuthResult | { ok: false; error: 'cancelled' }>;
  /** Token de acesso atual, para chamadas a funções do servidor. */
  accessToken(): Promise<string | null>;
};

type AuthContextValue = { state: AuthState; client: SupabaseClient | null; actions: AuthActions };

const AuthContext = createContext<AuthContextValue | null>(null);

function createActions(client: SupabaseClient | null): AuthActions {
  const unavailable = async () => ({ ok: false, error: 'unknown' }) as const;
  if (!client) {
    return {
      signIn: unavailable,
      signUp: unavailable,
      signOut: unavailable,
      requestPasswordReset: unavailable,
      exchangeCode: unavailable,
      updatePassword: unavailable,
      signInWithApple: unavailable,
      reauthenticateWithApple: unavailable,
      accessToken: async () => null,
    };
  }
  const auth = client.auth;
  const guard = async <T,>(task: () => Promise<AuthResult<T>>): Promise<AuthResult<T>> => {
    try {
      return await task();
    } catch (error) {
      return fail(error as Error);
    }
  };
  return {
    signIn: (email, password) =>
      guard(async () => {
        const { error } = await auth.signInWithPassword({ email: email.trim(), password });
        return error ? fail(error) : ok(undefined);
      }),
    signUp: (email, password) =>
      guard(async () => {
        const { data, error } = await auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: authRedirectUrl('/auth/callback') },
        });
        if (error) return fail(error);
        return ok(data.session ? 'signedIn' : 'confirmEmail');
      }),
    signOut: () =>
      guard(async () => {
        const { error } = await auth.signOut({ scope: 'local' });
        return error ? fail(error) : ok(undefined);
      }),
    requestPasswordReset: (email) =>
      guard(async () => {
        const { error } = await auth.resetPasswordForEmail(email.trim(), {
          redirectTo: authRedirectUrl('/auth/reset-password'),
        });
        return error ? fail(error) : ok(undefined);
      }),
    exchangeCode: (code) =>
      guard(async () => {
        const { error } = await auth.exchangeCodeForSession(code);
        return error ? fail(error) : ok(undefined);
      }),
    updatePassword: (password) =>
      guard(async () => {
        const { error } = await auth.updateUser({ password });
        return error ? fail(error) : ok(undefined);
      }),
    signInWithApple: () =>
      guard(async () => {
        try {
          await performAppleSignIn(client);
          return ok(undefined);
        } catch (error) {
          if (error instanceof AppleSignInCancelledError) return ok(undefined);
          return fail(error as Error);
        }
      }),
    accessToken: async () => (await auth.getSession()).data.session?.access_token ?? null,
    reauthenticateWithApple: async () => {
      try {
        await performAppleSignIn(client);
        return ok(undefined);
      } catch (error) {
        if (error instanceof AppleSignInCancelledError) return { ok: false, error: 'cancelled' };
        return fail(error as Error);
      }
    },
  };
}

export function AuthProvider({
  children,
  client = getSupabase(),
}: PropsWithChildren<{ client?: SupabaseClient | null }>) {
  const [state, setState] = useState<AuthState>(
    client ? { status: 'loading' } : { status: 'unavailable' },
  );
  const signingOut = useRef(false);

  useEffect(() => {
    if (!client) return;
    let cancelled = false;
    const applySession = (
      session: { user: { id: string; email?: string | null } } | null,
      expired: boolean,
    ) => {
      if (cancelled) return;
      if (session?.user) {
        setState({
          status: 'signedIn',
          user: { id: session.user.id, email: session.user.email ?? null },
        });
        return;
      }
      setState((previous) => ({
        status: 'signedOut',
        expired: expired && previous.status === 'signedIn',
      }));
    };

    void client.auth.getSession().then(({ data }) => {
      applySession(data.session, false);
    });

    const { data } = client.auth.onAuthStateChange((event, session) => {
      // Sem chamadas ao Supabase dentro deste callback (pode bloquear o cliente).
      const expired = event === 'SIGNED_OUT' && !signingOut.current;
      signingOut.current = false;
      applySession(session, expired);
    });
    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, [client]);

  const baseActions = useMemo(() => createActions(client), [client]);
  const signOut = useCallback(async (): Promise<AuthResult> => {
    signingOut.current = true;
    return baseActions.signOut();
  }, [baseActions]);
  const actions = useMemo<AuthActions>(() => ({ ...baseActions, signOut }), [baseActions, signOut]);
  const value = useMemo<AuthContextValue>(
    () => ({ state, client, actions }),
    [state, client, actions],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
