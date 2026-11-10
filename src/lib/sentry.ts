import * as Sentry from '@sentry/react-native';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

// Texto e imagens do replay ficam mascarados: os ecrãs mostram valores monetários.
Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: __DEV__ ? 'development' : 'production',
  sendDefaultPii: false,
  integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],
  tracesSampleRate: __DEV__ ? 1 : 0.2,
  profilesSampleRate: __DEV__ ? 1 : 0.2,
  enableLogs: true,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
});

/** Módulo do Sentry já iniciado (a web carrega-o à parte, ADR-047). */
export { Sentry };
