import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { createContext, useContext, useEffect, useMemo, type PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';

import { colorsByScheme, type ColorScheme, type ThemeColors } from './colors';

export type ThemePreference = 'system' | 'light' | 'dark';

export type Theme = {
  scheme: ColorScheme;
  colors: ThemeColors;
};

const ThemeContext = createContext<Theme | null>(null);

export function resolveColorScheme(
  preference: ThemePreference,
  systemScheme: ColorScheme | null | undefined,
): ColorScheme {
  if (preference !== 'system') return preference;
  return systemScheme === 'dark' ? 'dark' : 'light';
}

type Props = PropsWithChildren<{ preference?: ThemePreference }>;

export function ThemeProvider({ preference = 'system', children }: Props) {
  const systemScheme = useColorScheme();
  const scheme = resolveColorScheme(
    preference,
    systemScheme === 'dark' || systemScheme === 'light' ? systemScheme : null,
  );

  const theme = useMemo<Theme>(() => ({ scheme, colors: colorsByScheme[scheme] }), [scheme]);

  const navigationTheme = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: theme.colors.primary,
        background: theme.colors.background,
        card: theme.colors.surface,
        text: theme.colors.text,
        border: theme.colors.border,
      },
    };
  }, [scheme, theme.colors]);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(theme.colors.background);
  }, [theme.colors.background]);

  return (
    <ThemeContext.Provider value={theme}>
      <NavigationThemeProvider value={navigationTheme}>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        {children}
      </NavigationThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme must be used within ThemeProvider');
  return theme;
}
