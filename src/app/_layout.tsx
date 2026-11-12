import '@/i18n';

import { Stack } from 'expo-router';

import { useAppAccess } from '@/features/account/AccountGate';
import { AnalyticsTracker } from '@/features/app-shell/AnalyticsTracker';
import { AppProviders } from '@/features/app-shell/AppProviders';
import { RootErrorBoundary } from '@/features/app-shell/RootErrorBoundary';
import { wrapErrorBoundary, wrapRoot } from '@/lib/monitoring';

export const ErrorBoundary = wrapErrorBoundary(RootErrorBoundary);

/** Abrir um formulário diretamente por URL (ou recarregar a página) mantém as tabs por baixo. */
export const unstable_settings = { anchor: '(tabs)' };

const MODAL = { presentation: 'modal' } as const;

/** Rotas de dados só com conta; sem sessão, só boas-vindas e autenticação (ADR-034). */
function RootStack() {
  const granted = useAppAccess() === 'granted';
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={granted}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="onboarding"
          options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
        />
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
        <Stack.Screen name="wealth/payment/[id]" options={MODAL} />
        <Stack.Screen name="vehicles/new" options={MODAL} />
        <Stack.Screen name="vehicles/[id]" options={MODAL} />
        <Stack.Screen name="vehicles/edit/[id]" options={MODAL} />
        <Stack.Screen name="vehicles/link/[id]" options={MODAL} />
        <Stack.Screen name="documents/new" options={MODAL} />
        <Stack.Screen name="documents/[id]" options={MODAL} />
        <Stack.Screen name="sync/conflicts" options={MODAL} />
        <Stack.Screen name="backup" options={MODAL} />
      </Stack.Protected>
      <Stack.Protected guard={!granted}>
        <Stack.Screen name="welcome" />
        <Stack.Screen name="auth/sign-in" options={MODAL} />
        <Stack.Screen name="auth/sign-up" options={MODAL} />
        <Stack.Screen name="auth/forgot-password" options={MODAL} />
      </Stack.Protected>
      <Stack.Screen name="auth/reset-password" options={MODAL} />
      <Stack.Screen name="auth/callback" options={MODAL} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

function RootLayout() {
  return (
    <AppProviders>
      <AnalyticsTracker />
      <RootStack />
    </AppProviders>
  );
}

export default wrapRoot(RootLayout);
