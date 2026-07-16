import { spacing } from '@/lib/theme/spacing';

/** Fallback mínimo quando o SO não reporta insets (raro em edge-to-edge). */
export const ANDROID_MIN_BOTTOM_INSET = 12;

/** Clearance máximo para navigation bar / sheets / modais (cobre 3 botões). */
export const ANDROID_NAV_BAR_INSET_MAX = 48;

/** Tab bar Android — mínimo confortável (gestos / pill fino). */
export const ANDROID_TAB_BAR_INSET_MIN = 6;

/**
 * Tab bar Android — máximo para barras de gestos.
 * Evita a tab bar "demasiado subida" (ex. Samsung Galaxy A12 em modo gestos).
 */
export const ANDROID_TAB_BAR_GESTURE_MAX = 18;

/**
 * Limiar (px) a partir do qual o inset é tratado como barra de 3 botões.
 * Acima disto, a tab bar usa clearance total para não ficar colada/atrás.
 */
export const ANDROID_THREE_BUTTON_THRESHOLD = 30;

/** Tab bar Android — máximo absoluto (barra de 3 botões). */
export const ANDROID_TAB_BAR_INSET_MAX = ANDROID_NAV_BAR_INSET_MAX;

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

/** Diferença screen−window: nav bar reservada pelo SO quando insets não a reportam. */
export function resolveSystemNavigationGap(input: SafeAreaInput): number {
  return Math.max(0, input.screenHeight - input.windowHeight);
}

/**
 * Inset bruto fiável da navigation bar.
 *
 * Prefere `insets.bottom` (safe-area-context reporta corretamente a nav bar em
 * edge-to-edge) e só recorre ao gap screen−window quando o inset é 0. Não usa
 * `max(insets, gap)` cego porque, em vários Android, o gap inclui a status bar
 * e inflaria o inset → tab bar "demasiado subida" (ex. Samsung Galaxy A12).
 */
export function resolveRawBottomInset(input: SafeAreaInput): number {
  if (input.insetsBottom > 0) {
    return input.insetsBottom;
  }

  return resolveSystemNavigationGap(input);
}

/**
 * Inset inferior fiável da navigation bar / home indicator (modais, sheets,
 * botões fixos). Garante clearance suficiente para botões nunca ficarem atrás
 * da barra do sistema — sem clamp agressivo.
 */
export function resolveNavigationBarInset(input: SafeAreaInput): number {
  if (input.platform !== 'android') {
    return Math.max(input.insetsBottom, 0);
  }

  const raw = resolveRawBottomInset(input);

  if (raw <= 0) {
    return ANDROID_MIN_BOTTOM_INSET;
  }

  return clamp(raw, ANDROID_MIN_BOTTOM_INSET, ANDROID_NAV_BAR_INSET_MAX);
}

/**
 * Inset inferior da tab bar — adaptativo por magnitude do inset (sem checks por
 * modelo):
 *  - inset grande (≥ limiar) → barra de 3 botões → clearance total (não fica
 *    colada nem atrás dos botões);
 *  - inset pequeno → gestos / pill → padding justo (não fica demasiado subida).
 */
export function resolveTabBarBottomInset(input: SafeAreaInput): number {
  if (input.platform !== 'android') {
    return Math.max(input.insetsBottom, 0);
  }

  const raw = resolveRawBottomInset(input);

  if (raw <= 0) {
    return ANDROID_TAB_BAR_INSET_MIN;
  }

  if (raw >= ANDROID_THREE_BUTTON_THRESHOLD) {
    return clamp(raw, ANDROID_THREE_BUTTON_THRESHOLD, ANDROID_TAB_BAR_INSET_MAX);
  }

  return clamp(raw, ANDROID_TAB_BAR_INSET_MIN, ANDROID_TAB_BAR_GESTURE_MAX);
}

/**
 * Inset inferior efetivo (clearance fiável da barra do sistema).
 * Igual ao da navigation bar — usado por sheets, modais, botões fixos.
 */
export function resolveEffectiveBottomInset(input: SafeAreaInput): number {
  return resolveNavigationBarInset(input);
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
