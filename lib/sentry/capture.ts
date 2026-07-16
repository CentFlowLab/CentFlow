import type { AppLogSeverity } from '@/lib/diagnostics/app-log';
import { getDiagnosticRuntimeContext } from '@/lib/diagnostics/runtime-context';

import { detectFinancialDomain } from './tags';
import { isSentryClientActive } from './runtime';

function getSentry() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@sentry/react-native') as typeof import('@sentry/react-native');
  } catch {
    return null;
  }
}

export type SentryCaptureContext = {
  source: string;
  severity?: AppLogSeverity;
  screen?: string;
  action?: string;
  component?: string;
  financialDomain?: string;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
};

function shouldCapture(severity?: AppLogSeverity): boolean {
  if (!severity) return true;
  return severity === 'high' || severity === 'critical';
}

export function captureAppError(
  error: unknown,
  context: SentryCaptureContext,
): void {
  const sentry = getSentry();
  if (!sentry || !isSentryClientActive(sentry)) return;
  if (!shouldCapture(context.severity)) return;

  const err = error instanceof Error ? error : new Error(String(error));
  const runtime = getDiagnosticRuntimeContext();
  const financialDomain =
    context.financialDomain ?? detectFinancialDomain(context.source, err.message) ?? undefined;

  sentry.withScope((scope) => {
    scope.setTag('error_source', context.source);
    scope.setTag('screen', context.screen ?? runtime.screen);
    scope.setTag('user_action', context.action ?? runtime.action);
    if (context.component) scope.setTag('component', context.component);
    if (financialDomain) {
      scope.setTag('financial_domain', financialDomain);
      scope.setTag('requires_manual_review', 'true');
    }
    if (context.tags) {
      for (const [key, value] of Object.entries(context.tags)) {
        scope.setTag(key, value);
      }
    }
    if (context.extra) {
      scope.setContext('app', context.extra);
    }
    sentry.captureException(err);
  });
}

export function captureDomainCalculationError(
  domain: 'cashflow_projection' | 'savings_engine' | 'debt_amortization',
  error: unknown,
  extra?: Record<string, unknown>,
): void {
  captureAppError(error, {
    source: `financial:${domain}`,
    severity: 'high',
    financialDomain: domain,
    extra,
  });
}
