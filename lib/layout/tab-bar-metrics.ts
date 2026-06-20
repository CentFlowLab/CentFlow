/** Fallback mínimo quando o SO não reporta insets (raro em edge-to-edge). */
export const TAB_BAR_MIN_BOTTOM_INSET_ANDROID = 8;

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
    return measured;
  }

  return TAB_BAR_MIN_BOTTOM_INSET_ANDROID;
}
