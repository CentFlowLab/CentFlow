import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, type PropsWithChildren } from 'react';

import { PreferencesProvider, usePreferences } from '@/features/preferences';
import { appFonts } from '@/ui/theme/fonts';
import { ThemeProvider } from '@/ui/theme';

import { DataGate } from './DataGate';

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
      <DataGate>{children}</DataGate>
    </ThemeProvider>
  );
}

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <PreferencesProvider>
      <ReadyGate>{children}</ReadyGate>
    </PreferencesProvider>
  );
}
