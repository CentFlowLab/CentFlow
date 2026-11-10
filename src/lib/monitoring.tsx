import * as Sentry from '@sentry/react-native';

import './sentry';

/**
 * Monitorização de erros (Sentry, ADR-033). No telemóvel arranca logo com a app.
 * A versão web (`monitoring.web.tsx`) carrega o Sentry depois do primeiro ecrã (ADR-047).
 */
export const wrapErrorBoundary = Sentry.wrapExpoRouterErrorBoundary;
export const wrapRoot = Sentry.wrap;
