/** Confirmação explícita exigida pelo servidor. O diálogo da aplicação não chega. */
export const DELETE_CONFIRMATION = 'DELETE';

/** A sessão tem de ter sido renovada nos últimos 10 minutos. */
export const RECENT_AUTH_MS = 10 * 60 * 1000;

const CLOCK_SKEW_MS = 60 * 1000;

/** Origens da app web em desenvolvimento. A PWA entra por `ALLOWED_WEB_ORIGINS`. */
export const DEFAULT_WEB_ORIGINS = [
  'http://localhost:8081',
  'http://127.0.0.1:8081',
  'http://localhost:19006',
  'http://127.0.0.1:19006',
  'https://miven.pt',
  'https://www.miven.pt',
] as const;

export type DeleteAccountError = 'confirmation_required' | 'reauth_required';

export type DeleteAccountDecision = { ok: true } | { ok: false; error: DeleteAccountError };

export function isAllowedWebOrigin(origin: string | null, extra: readonly string[]): boolean {
  if (!origin) return false;
  return (DEFAULT_WEB_ORIGINS as readonly string[]).includes(origin) || extra.includes(origin);
}

/**
 * Cabeçalhos CORS. Sem `Origin` (aplicações nativas) não se envia
 * `Access-Control-Allow-Origin`: o CORS não autentica essas chamadas.
 */
export function deleteAccountCorsHeaders(
  origin: string | null,
  extra: readonly string[],
): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
  if (isAllowedWebOrigin(origin, extra)) headers['Access-Control-Allow-Origin'] = origin as string;
  return headers;
}

/** A decisão usa só o JWT já verificado e o corpo. Nunca um `user_id` enviado pelo cliente. */
export function evaluateDeleteAccount(input: {
  confirm: unknown;
  lastSignInAt: string | null | undefined;
  now: number;
}): DeleteAccountDecision {
  if (input.confirm !== DELETE_CONFIRMATION) {
    return { ok: false, error: 'confirmation_required' };
  }
  const signedInAt = input.lastSignInAt ? Date.parse(input.lastSignInAt) : Number.NaN;
  if (!Number.isFinite(signedInAt)) return { ok: false, error: 'reauth_required' };
  const age = input.now - signedInAt;
  if (age < -CLOCK_SKEW_MS || age > RECENT_AUTH_MS) {
    return { ok: false, error: 'reauth_required' };
  }
  return { ok: true };
}
