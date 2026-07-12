import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from 'react';
import { View, type ViewProps } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/api/keys';
import { useAuth } from '@/lib/auth';
import { loadStoredPreferences } from '@/lib/preferences/storage';
import type { ThemeId as PreferenceThemeId } from '@/lib/preferences/types';

import {
  applyTheme,
  getActiveThemeColors,
  getActiveThemeId,
  subscribeTheme,
  syncLegacyColorsObject,
} from './theme-store';
import { getThemeDefinition, normalizeThemeId } from './themes';
import type { ThemeColors, ThemeDefinition, ThemeId } from './types';
import { colors as legacyColors } from './colors';

type ThemeContextValue = {
  themeId: ThemeId;
  colors: ThemeColors;
  theme: ThemeDefinition;
  setThemeId: (themeId: ThemeId) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

type AppThemeProviderProps = {
  children: React.ReactNode;
};

function useThemeSnapshot() {
  return useSyncExternalStore(
    subscribeTheme,
    () => getActiveThemeId(),
    () => getActiveThemeId(),
  );
}

export function AppThemeProvider({ children }: AppThemeProviderProps) {
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const themeId = useThemeSnapshot();

  const applyAndSync = useCallback((nextThemeId: string | null | undefined) => {
    const resolved = applyTheme(nextThemeId);
    syncLegacyColorsObject(legacyColors);
    return resolved;
  }, []);

  useEffect(() => {
    applyAndSync('classic');
  }, [applyAndSync]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    let cancelled = false;

    void (async () => {
      const cached = queryClient.getQueryData<{ themeId?: PreferenceThemeId }>(
        queryKeys.preferences,
      );
      if (cached?.themeId) {
        applyAndSync(cached.themeId);
      }

      try {
        const stored = await loadStoredPreferences(user.id);
        if (!cancelled) {
          applyAndSync(stored.themeId);
        }
      } catch {
        // mantém tema em cache ou classic
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [applyAndSync, isAuthenticated, queryClient, user?.id]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event?.query.queryKey[0] !== queryKeys.preferences[0]) return;
      const data = event.query.state.data as { themeId?: string } | undefined;
      if (data?.themeId) {
        applyAndSync(data.themeId);
      }
    });

    const cached = queryClient.getQueryData<{ themeId?: string }>(queryKeys.preferences);
    if (cached?.themeId) {
      applyAndSync(cached.themeId);
    }

    return unsubscribe;
  }, [applyAndSync, isAuthenticated, queryClient]);

  const colors = getActiveThemeColors();
  const theme = getThemeDefinition(themeId);

  const setThemeId = useCallback(
    (next: ThemeId) => {
      applyAndSync(next);
    },
    [applyAndSync],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      themeId,
      colors,
      theme,
      setThemeId,
    }),
    [colors, setThemeId, theme, themeId],
  );

  return (
    <ThemeContext.Provider value={value}>
      <ThemeRootView>{children}</ThemeRootView>
    </ThemeContext.Provider>
  );
}

function ThemeRootView({ children, style, ...props }: ViewProps) {
  const { colors } = useTheme();
  return (
    <View style={[{ flex: 1, backgroundColor: colors.background }, style]} {...props}>
      {children}
    </View>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    const fallbackId = normalizeThemeId(getActiveThemeId());
    return {
      themeId: fallbackId,
      colors: getActiveThemeColors(),
      theme: getThemeDefinition(fallbackId),
      setThemeId: (id) => {
        applyTheme(id);
        syncLegacyColorsObject(legacyColors);
      },
    };
  }
  return context;
}

export function useThemeColors(): ThemeColors {
  return useTheme().colors;
}

export { normalizeThemeId };
