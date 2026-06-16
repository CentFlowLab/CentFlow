import { useMemo } from 'react';
import { Dimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Inset mínimo para barra de navegação Android (3 botões / gestos). */
const ANDROID_TAB_BAR_MIN_INSET = 64;

/**
 * Inset inferior fiável para a tab bar — em Android o safe area reporta 0
 * em muitos dispositivos edge-to-edge; usamos fallback generoso.
 */
export function useTabBarBottomInset(): number {
  const insets = useSafeAreaInsets();

  return useMemo(() => {
    if (Platform.OS !== 'android') {
      return Math.max(insets.bottom, 0);
    }

    const screen = Dimensions.get('screen');
    const window = Dimensions.get('window');
    const systemUiGap = Math.max(0, screen.height - window.height);

    return Math.max(insets.bottom, systemUiGap, ANDROID_TAB_BAR_MIN_INSET);
  }, [insets.bottom]);
}
