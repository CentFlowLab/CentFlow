/**
 * Paleta activa — mutável via ThemeProvider (Object.assign).
 * Preferir `useTheme().colors` em componentes novos.
 */
import { classicTheme } from './themes';
import type { ThemeColors } from './types';

export const colors: ThemeColors = { ...classicTheme.colors };

export type { ColorKey } from './types';
