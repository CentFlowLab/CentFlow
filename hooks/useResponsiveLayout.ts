import { useEffect, useMemo, useState } from 'react';
import { Dimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  getDeviceDimensions,
  resolveTabBarContentHeight,
  type DeviceDimensions,
} from '@/lib/layout/device-metrics';
import {
  resolveBottomActionPadding,
  resolveKeyboardAwareBottomPadding,
  resolveModalBottomPadding,
  resolveNavigationBarInset,
  resolveSheetBottomPadding,
  resolveTabBarBottomInset,
} from '@/lib/layout/safe-area';

export type ResponsiveLayout = DeviceDimensions & {
  insets: ReturnType<typeof useSafeAreaInsets>;
  navigationBarInset: number;
  tabBarContentHeight: number;
  tabBarBottomInset: number;
  tabBarTotalHeight: number;
  bottomActionPadding: number;
  sheetBottomPadding: number;
  modalBottomPadding: number;
  keyboardAwareBottomPadding: (keyboardHeight: number) => number;
};

/**
 * Métricas de layout responsivo — fonte única para safe area, tab bar e modais.
 */
export function useResponsiveLayout(): ResponsiveLayout {
  const insets = useSafeAreaInsets();
  const [dimensions, setDimensions] = useState(getDeviceDimensions);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', () => {
      setDimensions(getDeviceDimensions());
    });

    return () => subscription.remove();
  }, []);

  return useMemo(() => {
    const safeAreaInput = {
      platform: Platform.OS,
      insetsBottom: insets.bottom,
      screenHeight: dimensions.screenHeight,
      windowHeight: dimensions.windowHeight,
    };

    const navigationBarInset = resolveNavigationBarInset(safeAreaInput);
    const tabBarBottomInset = resolveTabBarBottomInset(safeAreaInput);
    const tabBarContentHeight = resolveTabBarContentHeight(Platform.OS);

    return {
      ...dimensions,
      insets,
      navigationBarInset,
      tabBarContentHeight,
      tabBarBottomInset,
      tabBarTotalHeight: tabBarContentHeight + tabBarBottomInset,
      bottomActionPadding: resolveBottomActionPadding(navigationBarInset),
      sheetBottomPadding: resolveSheetBottomPadding(navigationBarInset),
      modalBottomPadding: resolveModalBottomPadding(navigationBarInset),
      keyboardAwareBottomPadding: (keyboardHeight: number) =>
        resolveKeyboardAwareBottomPadding(
          keyboardHeight,
          navigationBarInset,
          insets.bottom,
        ),
    };
  }, [
    dimensions,
    insets.bottom,
    insets.left,
    insets.right,
    insets.top,
  ]);
}
