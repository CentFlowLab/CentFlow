import '@/lib/sentry';
import '@/i18n';

import * as Sentry from '@sentry/react-native';
import { Stack } from 'expo-router';

import { AnalyticsTracker } from '@/features/app-shell/AnalyticsTracker';
import { AppProviders } from '@/features/app-shell/AppProviders';
import { RootErrorBoundary } from '@/features/app-shell/RootErrorBoundary';

export const ErrorBoundary = Sentry.wrapExpoRouterErrorBoundary(RootErrorBoundary);

/** Abrir um formulário diretamente por URL (ou recarregar a página) mantém as tabs por baixo. */
export const unstable_settings = { anchor: '(tabs)' };

const MODAL = { presentation: 'modal' } as const;

function RootLayout() {
  return (
    <AppProviders>
      <AnalyticsTracker />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="new-transaction" options={MODAL} />
        <Stack.Screen name="import-statement" options={MODAL} />
        <Stack.Screen name="entry/[id]" options={MODAL} />
        <Stack.Screen name="account/new" options={MODAL} />
        <Stack.Screen name="account/[id]" options={MODAL} />
        <Stack.Screen name="category/new" options={MODAL} />
        <Stack.Screen name="category/[id]" options={MODAL} />
        <Stack.Screen name="budget/new" options={MODAL} />
        <Stack.Screen name="budget/[id]" options={MODAL} />
        <Stack.Screen name="subscription/new" options={MODAL} />
        <Stack.Screen name="subscription/[id]" options={MODAL} />
        <Stack.Screen name="goal/new" options={MODAL} />
        <Stack.Screen name="goal/[id]" options={MODAL} />
        <Stack.Screen name="wealth/new" options={MODAL} />
        <Stack.Screen name="wealth/[id]" options={MODAL} />
        <Stack.Screen name="vehicles/new" options={MODAL} />
        <Stack.Screen name="vehicles/[id]" options={MODAL} />
        <Stack.Screen name="documents/new" options={MODAL} />
        <Stack.Screen name="documents/[id]" options={MODAL} />
        <Stack.Screen name="auth/sign-in" options={MODAL} />
        <Stack.Screen name="auth/sign-up" options={MODAL} />
        <Stack.Screen name="auth/forgot-password" options={MODAL} />
        <Stack.Screen name="auth/reset-password" options={MODAL} />
        <Stack.Screen name="auth/callback" options={MODAL} />
        <Stack.Screen name="sync/conflicts" options={MODAL} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </AppProviders>
  );
}

export default Sentry.wrap(RootLayout);
