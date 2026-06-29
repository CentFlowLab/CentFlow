import { logAppError, logAppEvent } from '@/lib/diagnostics';

const SENSITIVE_PATTERN =
  /password|passwd|token|secret|authorization|bearer|otp|magic|iban|account|refresh_token|access_token|api_key|apikey|private_key|chave|credential/i;

function sanitizeContext(context?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!context) return undefined;

  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context)) {
    if (SENSITIVE_PATTERN.test(key)) continue;
    if (typeof value === 'string' && SENSITIVE_PATTERN.test(value)) continue;
    safe[key] = value;
  }
  return safe;
}

export function logSecurityEvent(
  message: string,
  context?: Record<string, unknown>,
  level: 'info' | 'warn' | 'error' = 'info',
): void {
  logAppEvent(level, 'security', message, sanitizeContext(context));
}

export function logSecurityError(
  message: string,
  error: unknown,
  context?: Record<string, unknown>,
): void {
  logAppError('security', error instanceof Error ? error : new Error(message), {
    message,
    ...sanitizeContext(context),
  });
}

/** Mensagem segura para utilizador em produção. */
export function getSafeSecurityMessage(
  code:
    | 'session_expired'
    | 'auth_failed'
    | 'reset_failed'
    | 'update_failed'
    | 'integrity_risk'
    | 'force_update'
    | 'maintenance',
): string {
  switch (code) {
    case 'session_expired':
      return 'A tua sessão expirou. Inicia sessão novamente.';
    case 'auth_failed':
      return 'Não foi possível concluir a autenticação. Tenta novamente.';
    case 'reset_failed':
      return 'Não foi possível redefinir a palavra-passe. Tenta novamente.';
    case 'update_failed':
      return 'Não foi possível verificar atualizações. Tenta mais tarde.';
    case 'integrity_risk':
      return 'Por segurança, esta ação não está disponível neste dispositivo.';
    case 'force_update':
      return 'Esta versão já não é suportada. Atualiza para continuares a usar a CentFlow com segurança.';
    case 'maintenance':
      return 'A CentFlow está temporariamente indisponível. Tenta novamente em breve.';
    default:
      return 'Ocorreu um erro. Tenta novamente.';
  }
}
