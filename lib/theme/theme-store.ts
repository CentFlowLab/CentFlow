import { getThemeColors, normalizeThemeId } from './themes';
import type { ThemeColors, ThemeId } from './types';

type ThemeListener = () => void;

let activeThemeId: ThemeId = 'classic';
let activeColors: ThemeColors = getThemeColors('classic');
const listeners = new Set<ThemeListener>();

export function getActiveThemeId(): ThemeId {
  return activeThemeId;
}

export function getActiveThemeColors(): ThemeColors {
  return activeColors;
}

export function subscribeTheme(listener: ThemeListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function applyTheme(themeIdInput: string | null | undefined): ThemeId {
  const nextId = normalizeThemeId(themeIdInput);
  const nextColors = getThemeColors(nextId);

  if (nextId === activeThemeId) {
    return activeThemeId;
  }

  activeThemeId = nextId;
  activeColors = nextColors;
  listeners.forEach((listener) => listener());
  return activeThemeId;
}

/** Sincroniza o objeto `colors` legado (imports estáticos) com o tema activo. */
export function syncLegacyColorsObject(target: ThemeColors): void {
  Object.assign(target, activeColors);
}
