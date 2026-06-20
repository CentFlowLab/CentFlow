import { NavigationBar } from 'expo-navigation-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { colors } from '@/lib/theme';

/** Mantém a barra de navegação Android alinhada ao tema e edge-to-edge. */
export function AndroidNavigationBarEffect() {
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    void NavigationBar.setBackgroundColorAsync(colors.tabBar);
    void NavigationBar.setButtonStyleAsync('light');
    void NavigationBar.setVisibilityAsync('visible');
  }, []);

  if (Platform.OS !== 'android') return null;

  return <NavigationBar style="dark" hidden={false} />;
}
