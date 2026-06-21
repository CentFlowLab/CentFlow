import { useMemo } from 'react';
import { Dimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  resolveTabBarBottomInset,
  resolveTabBarContentHeight,
} from '@/lib/layout/tab-bar-metrics';

/** Altura visual da tab bar (ícones + labels), sem safe area inferior. */
export const TAB_BAR_CONTENT_HEIGHT = resolveTabBarContentHeight(Platform.OS);

export type TabBarMetrics = {
  contentHeight: number;
  bottomInset: number;
  totalHeight: number;
};

/**
 * Métricas da tab bar — única fonte de verdade para altura e safe area inferior.
 */
export function useTabBarMetrics(): TabBarMetrics {
  const insets = useSafeAreaInsets();

  return useMemo(() => {
    const screen = Dimensions.get('screen');
    const window = Dimensions.get('window');
    const contentHeight = resolveTabBarContentHeight(Platform.OS);
    const bottomInset = resolveTabBarBottomInset({
      platform: Platform.OS,
      insetsBottom: insets.bottom,
      screenHeight: screen.height,
      windowHeight: window.height,
    });

    return {
      contentHeight,
      bottomInset,
      totalHeight: contentHeight + bottomInset,
    };
  }, [insets.bottom]);
}

/** @deprecated Usar useTabBarMetrics().bottomInset */
export function useTabBarBottomInset(): number {
  return useTabBarMetrics().bottomInset;
}
