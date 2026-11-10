import type { AuthError, EmailOtpType, SupabaseClient } from '@supabase/supabase-js';
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

import { i18n } from '@/i18n';
import { getSupabase } from '@/lib/supabase';

import { AppleSignInCancelledError, performAppleSignIn } from './apple-sign-in';
import { authRedirectUrl } from './auth-redirect';

export { authRedirectUrl } from './auth-redirect';

export type AuthUser = {
  id: string;
  email: string | null;
  /** Nome escolhido no registo, guardado nos metadados da conta. */
  username: string | null;
  /** Língua dos emails de autenticação, guardada nos metadados da conta (ADR-035). */
  locale: EmailLocale | null;
};

/** Os modelos de email só distinguem português, inglês e espanhol. */
export type EmailLocale = 'pt' | 'en' | 'es';

export function emailLocaleFor(language: string): EmailLocale {
  if (language.startsWith('en')) return 'en';
  if (language.startsWith('es')) return 'es';
  return 'pt';
}

function readLocale(metadata: unknown): EmailLocale | null {
  const value = (metadata as { locale?: unknown } | null | undefined)?.locale;
  return value === 'pt' || value === 'en' || value === 'es' ? value : null;
}

const MAX_USERNAME_LENGTH = 40;

export function readUsername(metadata: unknown): string | null {
  const value = (metadata as { username?: unknown } | null | undefined)?.username;
  if (typeof value !== 'string') return null;
  const name = value.trim();
  return name ? name.slice(0, MAX_USERNAME_LENGTH) : null;
}

export type AuthState =
  /** Projeto Supabase não configurado nesta build: só uso sem conta. */
  | { status: 'unavailable' }
  | { status: 'loading' }
  /** `expired`: a sessão terminou sem o utilizador sair (ex.: refresh token revogado). */
  | { status: 'signedOut'; expired: boolean }
  | { status: 'signedIn'; user: AuthUser };

export type AuthErrorCode =
  | 'invalidCredentials'
  /** Entrada com nome de utilizador: nome ou palavra-passe errados (o servidor não diz qual). */
  | 'invalidUsernameCredentials'
  | 'userNotFound'
  | 'usernameTaken'
  /** O email já foi confirmado, mas este dispositivo não tem o verificador PKCE. */
  | 'confirmedElsewhere'
  | 'emailNotConfirmed'
  | 'emailInvalid'
  | 'emailSendFailed'
  | 'redirectRejected'
  | 'emailExists'
  | 'weakPassword'
  | 'rateLimited'
  | 'network'
  | 'linkInvalid'
  | 'unknown';

export type AuthResult<T = void> = { ok: true; value: T } | { ok: false; error: AuthErrorCode };

/** A mensagem do servidor pode citar o email. Só serve para distinguir o código genérico. */
function serverMessage(error: AuthError): string {
  return typeof error.message === 'string' ? error.message.toLowerCase() : '';
}

/**
 * Traduz o erro do Supabase num código. A mensagem do servidor não é mostrada.
 * O registo fica em `fail` e contém só o código.
 */
export function toAuthErrorCode(error: AuthError | Error | null | undefined): AuthErrorCode {
  if (!error) return 'unknown';
  const authError = error as AuthError;
  const { code, status, name } = authError;
  if (name === 'AuthRetryableFetchError' || status === 0) return 'network';
  const message = serverMessage(authError);
  switch (code) {
    case 'invalid_credentials':
      return 'invalidCredentials';
    case 'email_not_confirmed':
      return 'emailNotConfirmed';
    case 'email_address_invalid':
      return 'emailInvalid';
    case 'email_address_not_authorized':
      return 'emailSendFailed';
    case 'unexpected_failure':
      return message.includes('sending confirmation email') ||
        message.includes('sending recovery email') ||
        message.includes('sending magic link') ||
        message.includes('sending invite email')
        ? 'emailSendFailed'
        : 'unknown';
    case 'validation_failed':
      return message.includes('redirect') ? 'redirectRejected' : 'unknown';
    case 'email_exists':
    case 'user_already_exists':
      return 'emailExists';
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
      return isMissingVerifier(error) ? 'confirmedElsewhere' : 'unknown';
  }
}

const OTP_TYPES = new Set<EmailOtpType>([
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
  'email',
]);

export function emailOtpType(value: string | undefined): EmailOtpType | null {
  return value && OTP_TYPES.has(value as EmailOtpType) ? (value as EmailOtpType) : null;
}

/**
 * O Supabase devolve `invalid_credentials` tanto para uma conta apagada como para uma
 * palavra-passe errada. A função `email_registered` distingue os dois. Se ainda não
 * existir no servidor, fica a mensagem da palavra-passe.
 */
async function lookupRegistered(client: SupabaseClient, email: string): Promise<boolean | null> {
  try {
    const { data, error } = await client.rpc('email_registered', { target_email: email.trim() });
    if (error || typeof data !== 'boolean') return null;
    return data;
  } catch {
    return null;
  }
}

/** Nomes de utilizador: minúsculas, algarismos, ponto e sublinhado (igual ao servidor). */
export const USERNAME_PATTERN = /^[a-z0-9._]{3,24}$/;

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

/** Disponibilidade do nome antes do registo. `null`: o servidor ainda não tem a função. */
async function lookupUsernameAvailable(
  client: SupabaseClient,
  username: string,
): Promise<boolean | null> {
  try {
    const { data, error } = await client.rpc('username_available', {
      target_username: username,
    });
    if (error || typeof data !== 'boolean') return null;
    return data;
  } catch {
    return null;
  }
}

/** O código PKCE só se troca no browser que pediu o email. Noutro dispositivo o email já está confirmado. */
export function isMissingVerifier(error: AuthError | Error | null | undefined): boolean {
  if (!error) return false;
  const code = (error as AuthError).code;
  if (
    code === 'pkce_code_verifier_not_found' ||
    code === 'pkce_verifier_missing' ||
    code === 'AuthPKCECodeVerifierMissingError'
  ) {
    return true;
  }
  if (error.name === 'AuthPKCECodeVerifierMissingError') return true;
  const message =
    typeof (error as AuthError).message === 'string' ? (error as AuthError).message : '';
  return message.toLowerCase().includes('code verifier not found');
}

/** Código seguro para o log. Nunca a mensagem: ela pode incluir o email. */
export function authLogCode(error: AuthError | Error | null | undefined): string {
  const code = (error as AuthError | null | undefined)?.code;
  if (typeof code === 'string' && code.length > 0) return code;
  return toAuthErrorCode(error);
}

const ok = <T,>(value: T): AuthResult<T> => ({ ok: true, value });
const fail = (error: AuthError | Error | null | undefined): AuthResult<never> => {
  console.error(`[auth] ${authLogCode(error)}`);
  return { ok: false, error: toAuthErrorCode(error) };
};

export { isAppleSignInAvailable } from './apple-sign-in';

export type AuthActions = {
  /** `identifier`: email ou nome de utilizador. */
  signIn(identifier: string, password: string): Promise<AuthResult>;
  /** `confirmEmail`: conta criada, à espera da confirmação por email. */
  signUp(
    email: string,
    password: string,
    username: string,
    /** `YYYY-MM-DD`, já verificada pela app (idade mínima). */
    birthDate: string,
  ): Promise<AuthResult<'signedIn' | 'confirmEmail'>>;
  signOut(): Promise<AuthResult>;
  requestPasswordReset(email: string): Promise<AuthResult>;
  /** Troca o código de um link de email por uma sessão (PKCE). */
  exchangeCode(code: string): Promise<AuthResult>;
  /** Confirma o email em qualquer dispositivo. Não depende do verificador PKCE. */
  verifyEmail(tokenHash: string, type: EmailOtpType): Promise<AuthResult>;
  updatePassword(password: string): Promise<AuthResult>;
  signInWithApple(): Promise<AuthResult>;
  /**
   * Volta a autenticar com a Apple antes de eliminar a conta.
   * Cancelar não conta como sucesso.
   */
  reauthenticateWithApple(): Promise<AuthResult | { ok: false; error: 'cancelled' }>;
  /** Token de acesso atual, para chamadas a funções do servidor. */
  accessToken(): Promise<string | null>;
  /** Guarda a língua dos emails nos metadados da conta. */
  updateEmailLocale(locale: EmailLocale): Promise<AuthResult>;
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
      verifyEmail: unavailable,
      updatePassword: unavailable,
      signInWithApple: unavailable,
      reauthenticateWithApple: unavailable,
      updateEmailLocale: unavailable,
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
    signIn: (identifier, password) =>
      guard(async () => {
        let email = identifier.trim();
        if (!email.includes('@')) {
          // O servidor só devolve o email da conta se a palavra-passe estiver certa.
          const { data, error } = await client.rpc('login_email', {
            target_username: normalizeUsername(email),
            target_password: password,
          });
          if (error) {
            const limited =
              typeof error.message === 'string' && error.message.includes('rate_limited');
            console.error(`[auth] ${limited ? 'username_rate_limited' : 'username_lookup_failed'}`);
            return { ok: false, error: limited ? 'rateLimited' : 'unknown' };
          }
          if (typeof data !== 'string' || !data) {
            return { ok: false, error: 'invalidUsernameCredentials' };
          }
          email = data;
        }
        const { error } = await auth.signInWithPassword({ email, password });
        if (!error) return ok(undefined);
        if (toAuthErrorCode(error) === 'invalidCredentials') {
          const registered = await lookupRegistered(client, email);
          if (registered === false) {
            console.error('[auth] user_not_found');
            return { ok: false, error: 'userNotFound' };
          }
        }
        return fail(error);
      }),
    signUp: (email, password, username, birthDate) =>
      guard(async () => {
        const handle = normalizeUsername(username);
        if ((await lookupUsernameAvailable(client, handle)) === false) {
          return { ok: false, error: 'usernameTaken' };
        }
        const { data, error } = await auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: authRedirectUrl('/auth/callback'),
            // Os emails seguem a língua da app (modelos em supabase/templates).
            data: {
              locale: emailLocaleFor(i18n.language),
              username: handle,
              birth_date: birthDate,
            },
          },
        });
        // Dois registos com o mesmo nome ao mesmo tempo: o índice único do servidor recusa o segundo.
        if (error && serverMessage(error).includes('database error saving new user')) {
          console.error('[auth] username_taken');
          return { ok: false, error: 'usernameTaken' };
        }
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
        if (!error) return ok(undefined);
        if (isMissingVerifier(error)) {
          console.error('[auth] pkce_verifier_missing');
          return { ok: false, error: 'confirmedElsewhere' };
        }
        return fail(error);
      }),
    verifyEmail: (tokenHash, type) =>
      guard(async () => {
        const { error } = await auth.verifyOtp({ token_hash: tokenHash, type });
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
    updateEmailLocale: (locale) =>
      guard(async () => {
        const { error } = await auth.updateUser({ data: { locale } });
        return error ? fail(error) : ok(undefined);
      }),
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
      session: { user: { id: string; email?: string | null; user_metadata?: unknown } } | null,
      expired: boolean,
    ) => {
      if (cancelled) return;
      if (session?.user) {
        setState({
          status: 'signedIn',
          user: {
            id: session.user.id,
            email: session.user.email ?? null,
            username: readUsername(session.user.user_metadata),
            locale: readLocale(session.user.user_metadata),
          },
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
