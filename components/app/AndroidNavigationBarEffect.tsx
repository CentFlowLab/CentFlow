import { NavigationBar } from 'expo-navigation-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { colors } from '@/lib/theme';

type InstalledNavigationBarApi = typeof NavigationBar & {
  setStyle?: (style: 'light' | 'dark') => void;
  setHidden?: (hidden: boolean) => void;
};

/** Mantém a barra de navegação Android alinhada ao tema e edge-to-edge. */
export function AndroidNavigationBarEffect() {
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const navigationBar = NavigationBar as InstalledNavigationBarApi;
    navigationBar.setStyle?.('light');
    navigationBar.setHidden?.(false);
  }, []);

  if (Platform.OS !== 'android') return null;

  return <NavigationBar style="dark" hidden={false} />;
}
