import { spacing } from '@/lib/theme';

/** Fallback mínimo quando o SO não reporta insets (raro em edge-to-edge). */
export const ANDROID_MIN_BOTTOM_INSET = 12;

/** Espaço extra acima da navigation bar Android (só soma ao inset medido). */
export const ANDROID_NAV_BUFFER = 4;

export type SafeAreaInput = {
  platform: string;
  insetsBottom: number;
  screenHeight: number;
  windowHeight: number;
};

/**
 * Inset inferior fiável da navigation bar / home indicator.
 * Usa insets.bottom, gap screen−window, ou fallback mínimo.
 */
export function resolveNavigationBarInset(input: SafeAreaInput): number {
  if (input.platform !== 'android') {
    return Math.max(input.insetsBottom, 0);
  }

  const systemUiGap = Math.max(0, input.screenHeight - input.windowHeight);
  const measured = Math.max(input.insetsBottom, systemUiGap);

  if (measured > 0) {
    return measured;
  }

  return ANDROID_MIN_BOTTOM_INSET;
}

/** Inset inferior da tab bar — inclui buffer de conforto no Android. */
export function resolveTabBarBottomInset(input: SafeAreaInput): number {
  if (input.platform !== 'android') {
    return resolveNavigationBarInset(input);
  }

  const systemUiGap = Math.max(0, input.screenHeight - input.windowHeight);
  const measured = Math.max(input.insetsBottom, systemUiGap);

  if (measured > 0) {
    return measured + ANDROID_NAV_BUFFER;
  }

  return ANDROID_MIN_BOTTOM_INSET;
}

/** Padding para botões fixos no fundo (fora da tab bar). */
export function resolveBottomActionPadding(
  navigationBarInset: number,
  extra = spacing.lg,
): number {
  return Math.max(navigationBarInset, spacing.md) + extra;
}

/** Padding inferior de bottom sheets. */
export function resolveSheetBottomPadding(navigationBarInset: number): number {
  return Math.max(navigationBarInset, spacing.lg) + spacing.sm;
}

/** Padding inferior de modais bottom (calendário, selects). */
export function resolveModalBottomPadding(navigationBarInset: number): number {
  return Math.max(navigationBarInset, spacing.lg) + spacing.xl;
}

/** Padding quando o teclado está aberto num sheet/modal. */
export function resolveKeyboardAwareBottomPadding(
  keyboardHeight: number,
  navigationBarInset: number,
  safeAreaBottom: number,
  footerGap = spacing.lg,
): number {
  if (keyboardHeight <= 0) {
    return resolveSheetBottomPadding(navigationBarInset);
  }

  return Math.max(
    footerGap,
    keyboardHeight - safeAreaBottom + footerGap,
  );
}

/** @deprecated alias — use ANDROID_MIN_BOTTOM_INSET */
export const TAB_BAR_MIN_BOTTOM_INSET_ANDROID = ANDROID_MIN_BOTTOM_INSET;

/** @deprecated alias — use ANDROID_NAV_BUFFER */
export const TAB_BAR_ANDROID_NAV_BUFFER = ANDROID_NAV_BUFFER;
