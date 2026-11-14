import { CATEGORY_COLOR_KEYS, categorySwatch } from '../theme/category-palette';
import { darkColors, lightColors, PLATE_COLORS, type ThemeColors } from '../theme/colors';
import { resolveColorScheme } from '../theme/ThemeProvider';
import { getBreakpoint } from '../layout/useBreakpoint';

function luminance(hex: string): number {
  const channels = hex
    .replace('#', '')
    .match(/.{2}/g)!
    .map((part) => {
      const c = parseInt(part, 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
  const [r = 0, g = 0, b = 0] = channels;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const TEXT_TOKENS: (keyof ThemeColors)[] = [
  'text',
  'textSecondary',
  'textTertiary',
  'primaryText',
  'positive',
  'negative',
  'warning',
];

describe.each([
  ['light', lightColors],
  ['dark', darkColors],
] as const)('%s theme', (_, colors) => {
  it.each(TEXT_TOKENS)('%s meets WCAG AA (4.5:1) on background and surface', (token) => {
    expect(contrast(colors[token], colors.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors[token], colors.surface)).toBeGreaterThanOrEqual(4.5);
  });

  // Linhas e cartões tocados ou com o rato por cima mudam o fundo: o texto tem de continuar legível.
  it.each(TEXT_TOKENS)('%s meets WCAG AA on surfaceHover and surfaceMuted', (token) => {
    expect(contrast(colors[token], colors.surfaceHover)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors[token], colors.surfaceMuted)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(['heroText', 'heroTextMuted', 'heroPositive', 'heroNegative'] as const)(
    '%s meets WCAG AA (4.5:1) on both ends of the hero gradient',
    (token) => {
      expect(contrast(colors[token], colors.heroStart)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(colors[token], colors.heroEnd)).toBeGreaterThanOrEqual(4.5);
    },
  );

  it('primary button label meets WCAG AA', () => {
    expect(contrast(colors.onPrimary, colors.primary)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(CATEGORY_COLOR_KEYS)(
    'category colour %s meets WCAG non-text contrast (3:1) on its swatch and on surface',
    (key) => {
      const swatch = categorySwatch(key, colors === lightColors ? 'light' : 'dark');
      expect(contrast(swatch.foreground, swatch.background)).toBeGreaterThanOrEqual(3);
      expect(contrast(swatch.foreground, colors.surface)).toBeGreaterThanOrEqual(3);
    },
  );
});

describe('PLATE_COLORS', () => {
  it('plate text and the country code meet WCAG AA', () => {
    expect(contrast(PLATE_COLORS.text, PLATE_COLORS.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(PLATE_COLORS.bandText, PLATE_COLORS.euBlue)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('resolveColorScheme', () => {
  it('follows the system when preference is "system"', () => {
    expect(resolveColorScheme('system', 'dark')).toBe('dark');
    expect(resolveColorScheme('system', null)).toBe('light');
  });

  it('honours an explicit choice', () => {
    expect(resolveColorScheme('light', 'dark')).toBe('light');
    expect(resolveColorScheme('dark', 'light')).toBe('dark');
  });
});

describe('getBreakpoint', () => {
  it.each([
    [375, 'compact'],
    [767, 'compact'],
    [768, 'medium'],
    [1199, 'medium'],
    [1200, 'expanded'],
  ] as const)('%ipx → %s', (width, expected) => {
    expect(getBreakpoint(width)).toBe(expected);
  });
});
