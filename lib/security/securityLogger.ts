import { logAppError, logAppEvent } from '@/lib/diagnostics';
import { sanitizeLogContext } from '@/lib/security/log-sanitize';

function sanitizeContext(context?: Record<string, unknown>): Record<string, unknown> | undefined {
  return sanitizeLogContext(context);
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
      return 'Não foi possível verificar actualizações. Tenta mais tarde.';
    case 'integrity_risk':
      return 'Por segurança, esta acção não está disponível neste dispositivo.';
    case 'force_update':
      return 'Esta versão já não é suportada. Actualiza para continuares a usar a CentFlow com segurança.';
    case 'maintenance':
      return 'A CentFlow está temporariamente indisponível. Tenta novamente em breve.';
    default:
      return 'Ocorreu um erro. Tenta novamente.';
  }
}
