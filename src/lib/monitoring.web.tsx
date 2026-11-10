import { useEffect, type ComponentType } from 'react';

import { createEarlyErrorBuffer } from './early-errors';

type SentryModule = (typeof import('./sentry'))['Sentry'];

let loading: Promise<SentryModule> | null = null;

/**
 * Web (ADR-047): o Sentry (≈ 1,4 MB) fica num pedaço de código à parte, carregado quando o browser
 * está livre depois do primeiro ecrã. As integrações e a configuração são as de `sentry.ts`.
 */
function loadSentry(): Promise<SentryModule> {
  // Um único ponto de entrada: dois `import()` com o Sentry em comum iriam para o pacote inicial.
  loading ??= import('./sentry').then((module) => module.Sentry);
  return loading;
}

/** Erros antes de o Sentry carregar: guardados e enviados quando ele chega. */
const early = createEarlyErrorBuffer();

if (typeof window !== 'undefined') {
  const onError = (event: ErrorEvent) => {
    early.push(event.error ?? new Error('window.onerror'));
  };
  const onRejection = (event: PromiseRejectionEvent) => {
    early.push(event.reason);
  };
  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);

  const start = () => {
    loadSentry()
      .then((sentry) => {
        // A partir daqui o Sentry tem os seus próprios ouvintes globais.
        window.removeEventListener('error', onError);
        window.removeEventListener('unhandledrejection', onRejection);
        early.flush((error) => sentry.captureException(error));
      })
      .catch(() => {
        loading = null;
        console.error('[monitoring] load_failed');
      });
  };
  const idle = (
    window as { requestIdleCallback?: (callback: () => void, options?: object) => void }
  ).requestIdleCallback;
  if (idle) idle(start, { timeout: 4000 });
  else setTimeout(start, 2000);
}

/** O ecrã de erro reporta o erro ao Sentry (carregado nessa altura, se ainda não estiver). */
export function wrapErrorBoundary<P extends { error: Error }>(
  Boundary: ComponentType<P>,
): ComponentType<P> {
  function ReportedBoundary(props: P) {
    useEffect(() => {
      void loadSentry()
        .then((sentry) => sentry.captureException(props.error))
        .catch(() => undefined);
    }, [props.error]);
    return <Boundary {...props} />;
  }
  return ReportedBoundary;
}

/** Na web, a raiz não precisa do invólucro do Sentry (toques e perfis são do telemóvel). */
export function wrapRoot<P extends object>(Root: ComponentType<P>): ComponentType<P> {
  return Root;
}
