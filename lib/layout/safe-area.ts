import { spacing } from '@/lib/theme';

/** Fallback mínimo quando o SO não reporta insets (raro em edge-to-edge). */
export const ANDROID_MIN_BOTTOM_INSET = 12;

/** Tab bar Android — mínimo confortável acima da navigation bar. */
export const ANDROID_TAB_BAR_INSET_MIN = 8;

/** Tab bar Android — máximo para evitar tab bar a flutuar demasiado (ex. Samsung A12). */
export const ANDROID_TAB_BAR_INSET_MAX = 24;

/** @deprecated Tab bar já não soma buffer extra */
export const ANDROID_NAV_BUFFER = 0;

export type SafeAreaInput = {
  platform: string;
  insetsBottom: number;
  screenHeight: number;
  windowHeight: number;
};

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Inset bruto: prefere insets.bottom; só usa gap screen−window se inset for 0. */
export function resolveRawBottomInset(input: SafeAreaInput): number {
  if (input.insetsBottom > 0) {
    return input.insetsBottom;
  }

  return Math.max(0, input.screenHeight - input.windowHeight);
}

/**
 * Inset inferior fiável da navigation bar / home indicator (modais, sheets).
 * Não usa clamp agressivo — garante botões visíveis.
 */
export function resolveNavigationBarInset(input: SafeAreaInput): number {
  if (input.platform !== 'android') {
    return Math.max(input.insetsBottom, 0);
  }

  const raw = resolveRawBottomInset(input);

  if (raw <= 0) {
    return ANDROID_MIN_BOTTOM_INSET;
  }

  return clamp(raw, ANDROID_MIN_BOTTOM_INSET, 48);
}

/**
 * Inset inferior só para a tab bar — clamp 8–24px no Android.
 * Evita tab bar demasiado subida quando o SO reporta inset inflacionado.
 */
export function resolveTabBarBottomInset(input: SafeAreaInput): number {
  if (input.platform !== 'android') {
    return Math.max(input.insetsBottom, 0);
  }

  const raw = resolveRawBottomInset(input);

  if (raw <= 0) {
    return ANDROID_TAB_BAR_INSET_MIN;
  }

  return clamp(raw, ANDROID_TAB_BAR_INSET_MIN, ANDROID_TAB_BAR_INSET_MAX);
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
