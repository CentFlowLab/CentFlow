import type { ColorScheme } from './colors';

export const CATEGORY_COLOR_KEYS = [
  'indigo',
  'blue',
  'teal',
  'green',
  'amber',
  'orange',
  'red',
  'pink',
  'purple',
  'slate',
] as const;

export type CategoryColorKey = (typeof CATEGORY_COLOR_KEYS)[number];

type Swatch = { foreground: string; background: string };

/**
 * Cores das categorias por tema. A base de dados guarda apenas a chave,
 * para que o aspeto se adapte ao tema e possa evoluir sem migrações.
 */
const PALETTE: Record<ColorScheme, Record<CategoryColorKey, Swatch>> = {
  light: {
    indigo: { foreground: '#4B45E6', background: '#ECEBFE' },
    blue: { foreground: '#1D6FD8', background: '#E3EEFC' },
    teal: { foreground: '#0B7A75', background: '#DDF3F1' },
    green: { foreground: '#0B7F3F', background: '#E3F5EA' },
    amber: { foreground: '#9A5800', background: '#FFF3D6' },
    orange: { foreground: '#C2410C', background: '#FDEBDD' },
    red: { foreground: '#D1293A', background: '#FCEBEC' },
    pink: { foreground: '#C02679', background: '#FBE7F2' },
    purple: { foreground: '#7E3AD6', background: '#F1E8FC' },
    slate: { foreground: '#5A5C6A', background: '#EFEFF3' },
  },
  dark: {
    indigo: { foreground: '#A3A1FF', background: '#1E1D3D' },
    blue: { foreground: '#7DB4FF', background: '#13243B' },
    teal: { foreground: '#5ED6CC', background: '#0F2826' },
    green: { foreground: '#3DD68C', background: '#11271C' },
    amber: { foreground: '#F5B841', background: '#2D230F' },
    orange: { foreground: '#FF9F66', background: '#2E1B10' },
    red: { foreground: '#FF6B72', background: '#2E1417' },
    pink: { foreground: '#FF7EB9', background: '#2E1323' },
    purple: { foreground: '#C49BFF', background: '#24173A' },
    slate: { foreground: '#A3A4B0', background: '#1D1D22' },
  },
};

export function isCategoryColorKey(value: string): value is CategoryColorKey {
  return (CATEGORY_COLOR_KEYS as readonly string[]).includes(value);
}

export function categorySwatch(color: string, scheme: ColorScheme): Swatch {
  return PALETTE[scheme][isCategoryColorKey(color) ? color : 'slate'];
}
