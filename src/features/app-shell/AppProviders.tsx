import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, type PropsWithChildren } from 'react';

import { AccountGate } from '@/features/account/AccountGate';
import { AuthProvider } from '@/features/account/AuthProvider';
import { PreferencesProvider, usePreferences } from '@/features/preferences';
import { PaywallProvider } from '@/lib/paywall';
import { appFonts } from '@/ui/theme/fonts';
import { ThemeProvider } from '@/ui/theme';

void SplashScreen.preventAutoHideAsync();

/** Mantém o splash até as fontes e preferências (tema, idioma) estarem prontas, evitando "flashes". */
function ReadyGate({ children }: PropsWithChildren) {
  const { preferences, isLoaded } = usePreferences();
  const [fontsLoaded, fontError] = useFonts(appFonts);
  const ready = isLoaded && (fontsLoaded || fontError !== null);

  useEffect(() => {
    if (fontError) console.warn('[fonts] A usar fonte do sistema como alternativa.');
  }, [fontError]);

  useEffect(() => {
    if (ready) SplashScreen.hide();
  }, [ready]);

  if (!ready) return null;
  return (
    <ThemeProvider preference={preferences.theme}>
      <AuthProvider>
        <AccountGate>{children}</AccountGate>
      </AuthProvider>
    </ThemeProvider>
  );
}

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <PreferencesProvider>
      <PaywallProvider>
        <ReadyGate>{children}</ReadyGate>
      </PaywallProvider>
    </PreferencesProvider>
  );
}
