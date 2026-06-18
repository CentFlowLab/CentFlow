import { logAppError, logAppEvent } from '@/lib/diagnostics';
import { setDiagnosticAction } from '@/lib/diagnostics/runtime-context';

export type MutationFailureContext = {
  action: string;
  screen?: string;
  payload?: Record<string, unknown>;
  authenticated?: boolean;
};

const SENSITIVE_KEYS = /password|token|secret|authorization|iban|account/i;

function sanitizePayload(payload?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!payload) return undefined;

  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (SENSITIVE_KEYS.test(key)) continue;
    if (typeof value === 'string' && value.length > 120) {
      safe[key] = `${value.slice(0, 120)}…`;
      continue;
    }
    safe[key] = value;
  }
  return safe;
}

/** Regista falha de mutation/formulário no CentFlow Doctor (sem dados sensíveis). */
export function logDoctorMutationFailure(
  error: unknown,
  context: MutationFailureContext,
): void {
  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : 'Erro desconhecido';

  setDiagnosticAction(context.action);

  logAppError('doctor:mutation', error instanceof Error ? error : new Error(message), {
    action: context.action,
    screen: context.screen,
    component: context.screen,
    authenticated: context.authenticated,
    payload: sanitizePayload(context.payload),
  });
}

export function logDoctorValidationFailure(
  context: MutationFailureContext & { reason: string },
): void {
  logAppEvent('warn', 'doctor:validation', context.reason, {
    action: context.action,
    screen: context.screen,
    payload: sanitizePayload(context.payload),
  });
}
