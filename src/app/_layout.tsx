import '@/i18n';

import { Stack } from 'expo-router';

import { AppProviders } from '@/features/app-shell/AppProviders';

export { RootErrorBoundary as ErrorBoundary } from '@/features/app-shell/RootErrorBoundary';

/** Abrir um formulário diretamente por URL (ou recarregar a página) mantém as tabs por baixo. */
export const unstable_settings = { anchor: '(tabs)' };

const MODAL = { presentation: 'modal' } as const;

export default function RootLayout() {
  return (
    <AppProviders>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="new-transaction" options={MODAL} />
        <Stack.Screen name="entry/[id]" options={MODAL} />
        <Stack.Screen name="account/new" options={MODAL} />
        <Stack.Screen name="account/[id]" options={MODAL} />
        <Stack.Screen name="category/new" options={MODAL} />
        <Stack.Screen name="category/[id]" options={MODAL} />
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
