import { useEffect, useMemo, useState } from 'react';
import { Dimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  getDeviceDimensions,
  resolveModalMaxHeight,
  resolveScreenHorizontalPadding,
  resolveTabBarContentHeight,
  type DeviceDimensions,
} from '@/lib/layout/device-metrics';
import {
  resolveBottomActionPadding,
  resolveEffectiveBottomInset,
  resolveKeyboardAwareBottomPadding,
  resolveModalBottomPadding,
  resolveNavigationBarInset,
  resolveSheetBottomPadding,
  resolveSystemNavigationGap,
  resolveTabBarBottomInset,
} from '@/lib/layout/safe-area';
import { spacing } from '@/lib/theme';

export type ResponsiveLayout = DeviceDimensions & {
  insets: ReturnType<typeof useSafeAreaInsets>;
  /** Safe area superior (status bar / notch). */
  topInset: number;
  /** insets.bottom bruto reportado pelo SO. */
  bottomInset: number;
  /** Diferença screen−window (nav bar reservada pelo SO). */
  systemNavigationGap: number;
  /** Clearance inferior fiável da barra do sistema (sheets, modais, botões). */
  effectiveBottomInset: number;
  navigationBarInset: number;
  tabBarContentHeight: number;
  tabBarBottomInset: number;
  /** Padding inferior aplicado dentro da tab bar (= tabBarBottomInset). */
  tabBarPaddingBottom: number;
  tabBarTotalHeight: number;
  /** Alias semântico de tabBarTotalHeight. */
  tabBarHeight: number;
  /** Padding horizontal padrão dos ecrãs (maior em tablets). */
  screenHorizontalPadding: number;
  /** Padding inferior de conteúdo scrollável (a tab bar já é reservada pelo navigator). */
  contentBottomPadding: number;
  bottomActionPadding: number;
  sheetBottomPadding: number;
  modalBottomPadding: number;
  /** Altura máxima recomendada para modais/sheets. */
  modalMaxHeight: number;
  keyboardAwareBottomPadding: (keyboardHeight: number) => number;
  /** Alias de keyboardAwareBottomPadding. */
  keyboardSafePadding: (keyboardHeight: number) => number;
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
    const effectiveBottomInset = resolveEffectiveBottomInset(safeAreaInput);
    const systemNavigationGap = resolveSystemNavigationGap(safeAreaInput);
    const tabBarBottomInset = resolveTabBarBottomInset(safeAreaInput);
    const tabBarContentHeight = resolveTabBarContentHeight(Platform.OS);
    const tabBarTotalHeight = tabBarContentHeight + tabBarBottomInset;
    const screenHorizontalPadding = resolveScreenHorizontalPadding(
      dimensions.isTablet,
    );

    const keyboardAwareBottomPadding = (keyboardHeight: number) =>
      resolveKeyboardAwareBottomPadding(
        keyboardHeight,
        navigationBarInset,
        insets.bottom,
      );

    return {
      ...dimensions,
      insets,
      topInset: insets.top,
      bottomInset: insets.bottom,
      systemNavigationGap,
      effectiveBottomInset,
      navigationBarInset,
      tabBarContentHeight,
      tabBarBottomInset,
      tabBarPaddingBottom: tabBarBottomInset,
      tabBarTotalHeight,
      tabBarHeight: tabBarTotalHeight,
      screenHorizontalPadding,
      // A tab bar é reservada pelo navigator (cena já fica acima dela), por isso
      // o conteúdo só precisa de respiro — somar a altura da tab bar duplicaria
      // o espaço e criaria a "zona morta" inferior nos ecrãs.
      contentBottomPadding: spacing['2xl'],
      bottomActionPadding: resolveBottomActionPadding(navigationBarInset),
      sheetBottomPadding: resolveSheetBottomPadding(navigationBarInset),
      modalBottomPadding: resolveModalBottomPadding(navigationBarInset),
      modalMaxHeight: resolveModalMaxHeight(dimensions.windowHeight),
      keyboardAwareBottomPadding,
      keyboardSafePadding: keyboardAwareBottomPadding,
    };
  }, [
    dimensions,
    insets,
    insets.bottom,
    insets.left,
    insets.right,
    insets.top,
  ]);
}
