/** Fallback mínimo quando o SO não reporta insets (raro em edge-to-edge). */
export const TAB_BAR_MIN_BOTTOM_INSET_ANDROID = 12;

/** Espaço extra acima da navigation bar para conforto visual (não fixo — só soma ao inset medido). */
export const TAB_BAR_ANDROID_NAV_BUFFER = 4;

/**
 * Calcula inset inferior fiável para a navigation bar Android.
 * Evita constantes fixas (ex.: 64px) que falham em gestos vs 3 botões.
 */
export function resolveTabBarBottomInset(input: {
  platform: string;
  insetsBottom: number;
  screenHeight: number;
  windowHeight: number;
}): number {
  if (input.platform !== 'android') {
    return Math.max(input.insetsBottom, 0);
  }

  const systemUiGap = Math.max(0, input.screenHeight - input.windowHeight);
  const measured = Math.max(input.insetsBottom, systemUiGap);

  if (measured > 0) {
    return measured + TAB_BAR_ANDROID_NAV_BUFFER;
  }

  return TAB_BAR_MIN_BOTTOM_INSET_ANDROID;
}

export function resolveTabBarContentHeight(platform: string): number {
  if (platform === 'ios') return 68;
  if (platform === 'android') return 60;
  return 64;
}
