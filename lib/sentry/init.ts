import Constants from 'expo-constants';
import * as Updates from 'expo-updates';

import { getRuntimePublicEnv } from '@/lib/config/runtime-env';

import { isCrashReportingConsented } from '@/lib/privacy/consent.memory';

import { scrubSentryEvent } from './privacy';
import { isSentryClientActive } from './runtime';

let initialized = false;

function getSentry() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@sentry/react-native') as typeof import('@sentry/react-native');
  } catch {
    return null;
  }
}

export function isSentryConfigured(): boolean {
  return Boolean(getRuntimePublicEnv('EXPO_PUBLIC_SENTRY_DSN')?.trim());
}

export function initSentry(): void {
  if (initialized) return;

  if (!isCrashReportingConsented()) {
    if (__DEV__) {
      console.info('[Sentry] Relatórios de crash desactivados — sem consentimento.');
    }
    return;
  }

  const Sentry = getSentry();
  if (!Sentry) {
    if (__DEV__) {
      console.info('[Sentry] Módulo nativo indisponível — rebuild EAS necessário.');
    }
    return;
  }

  const dsn = getRuntimePublicEnv('EXPO_PUBLIC_SENTRY_DSN');
  if (!dsn) {
    if (__DEV__) {
      console.info('[Sentry] DSN em falta — telemetria desactivada.');
    }
    return;
  }

  const variant = getRuntimePublicEnv('EXPO_PUBLIC_APP_VARIANT') || 'unknown';
  const version = Constants.expoConfig?.version ?? '0.0.0';
  const buildId = Updates.updateId ?? 'embedded';

  Sentry.init({
    dsn,
    environment: variant,
    release: `centflow@${version}`,
    dist: String(buildId),
    enableAutoSessionTracking: true,
    attachStacktrace: true,
    tracesSampleRate: variant === 'production' ? 0.1 : 0.2,
    beforeSend(event) {
      return scrubSentryEvent(event) as typeof event;
    },
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.data) {
        breadcrumb.data = scrubSentryEvent({
          message: '',
          extra: breadcrumb.data as Record<string, unknown>,
        })?.extra;
      }
      return breadcrumb;
    },
  });

  const scope = Sentry.getGlobalScope();
  scope.setTag('app_variant', variant);
  scope.setTag('expo-update-id', Updates.updateId ?? 'embedded');
  scope.setTag('expo-is-embedded-update', String(Updates.isEmbeddedLaunch));

  initialized = true;
}

export function setSentryUserFromHash(userHash: string | null): void {
  const sentry = getSentry();
  if (!sentry || !isSentryClientActive(sentry)) return;
  if (!userHash) {
    sentry.setUser(null);
    return;
  }
  sentry.setUser({ id: userHash });
}

/** Chamado após carregar consentimento (PrivacyConsentGate). */
export function bootstrapSentryFromConsent(): void {
  initSentry();
}
