import { useMemo } from 'react';
import { Platform } from 'react-native';

import { resolveTabBarContentHeight } from '@/lib/layout/device-metrics';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

/** Altura visual da tab bar (ícones + labels), sem safe area inferior. */
export const TAB_BAR_CONTENT_HEIGHT = resolveTabBarContentHeight(Platform.OS);

export type TabBarMetrics = {
  contentHeight: number;
  bottomInset: number;
  totalHeight: number;
};

/**
 * Métricas da tab bar — delega em useResponsiveLayout.
 */
export function useTabBarMetrics(): TabBarMetrics {
  const layout = useResponsiveLayout();

  return useMemo(
    () => ({
      contentHeight: layout.tabBarContentHeight,
      bottomInset: layout.tabBarBottomInset,
      totalHeight: layout.tabBarTotalHeight,
    }),
    [
      layout.tabBarBottomInset,
      layout.tabBarContentHeight,
      layout.tabBarTotalHeight,
    ],
  );
}

/** @deprecated Usar useTabBarMetrics().bottomInset */
export function useTabBarBottomInset(): number {
  return useTabBarMetrics().bottomInset;
}
