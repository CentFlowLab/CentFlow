import { Pressable, StyleSheet, View } from 'react-native';

import {
  SettingsHero,
  SettingsScreenLayout,
} from '@/components/settings';
import { Card, LoadingSpinner, Text } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useUpdatePreferences, useUserPreferences } from '@/hooks/queries/useUserPreferences';
import { THEME_OPTIONS } from '@/lib/preferences/config';
import type { ThemeId } from '@/lib/preferences/types';
import { useTheme, useThemedStyles } from '@/lib/theme';
import { spacing } from '@/lib/theme';

export default function AppearanceScreen() {
  const { data: preferences, isLoading } = useUserPreferences();
  const updatePreferences = useUpdatePreferences();
  const { showToast } = useToast();
  const { themeId: activeThemeId } = useTheme();
  const styles = useThemedStyles(createStyles);

  async function handleSelectTheme(themeId: ThemeId) {
    if (themeId === activeThemeId) return;

    const theme = THEME_OPTIONS.find((item) => item.id === themeId);
    if (!theme) return;

    try {
      await updatePreferences.mutateAsync({ themeId });
      showToast(`Tema «${theme.name}» activo.`, 'success');
    } catch {
      showToast('Não foi possível guardar o tema.', 'error');
    }
  }

  if (isLoading || !preferences) {
    return (
      <SettingsScreenLayout title="Aparência" subtitle="Tema visual da aplicação">
        <LoadingSpinner message="A carregar tema..." />
      </SettingsScreenLayout>
    );
  }

  return (
    <SettingsScreenLayout title="Aparência" subtitle="Escolhe o visual da CentFlow">
      <SettingsHero
        icon={{ ios: 'paintbrush.fill', android: 'palette', web: 'palette' }}
        title="Temas"
        description="Quatro skins escuras premium — só a paleta muda, a hierarquia visual mantém-se."
      />

      <View style={styles.grid}>
        {THEME_OPTIONS.map((theme) => {
          const isActive = theme.id === activeThemeId;
          return (
            <Pressable
              key={theme.id}
              onPress={() => void handleSelectTheme(theme.id)}
              style={({ pressed }) => [styles.themePressable, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`Tema ${theme.name}`}>
              <Card
                variant={isActive ? 'elevated' : 'outlined'}
                style={[styles.themeCard, isActive && styles.themeCardActive]}
                padding="md">
                <View
                  style={[
                    styles.preview,
                    { backgroundColor: theme.previewBackground },
                  ]}>
                  <View
                    style={[styles.previewAccentBar, { backgroundColor: theme.previewAccent }]}
                  />
                  <View style={styles.previewDots}>
                    <View
                      style={[styles.previewDot, { backgroundColor: theme.previewAccent }]}
                    />
                    <View style={[styles.previewLine, { backgroundColor: theme.previewAccent }]}
                    />
                  </View>
                </View>

                <View style={styles.themeMeta}>
                  <Text variant="bodyMedium">{theme.name}</Text>
                  {isActive ? (
                    <View style={[styles.activeBadge, { backgroundColor: `${theme.previewAccent}22` }]}>
                      <Text variant="caption" style={{ color: theme.previewAccent }}>
                        Activo
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text variant="caption" color="textMuted">
                  {theme.description}
                </Text>
              </Card>
            </Pressable>
          );
        })}
      </View>
    </SettingsScreenLayout>
  );
}

function createStyles(colors: import('@/lib/theme/types').ThemeColors) {
  return StyleSheet.create({
    grid: {
      gap: spacing.md,
    },
    themePressable: {
      borderRadius: 16,
    },
    themeCard: {
      gap: spacing.sm,
    },
    themeCardActive: {
      borderColor: colors.primary,
      borderWidth: 1.5,
    },
    preview: {
      height: 72,
      borderRadius: 12,
      padding: spacing.sm,
      justifyContent: 'space-between',
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
    },
    previewAccentBar: {
      height: 4,
      width: '36%',
      borderRadius: 999,
      opacity: 0.95,
    },
    previewDots: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    previewDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      opacity: 0.9,
    },
    previewLine: {
      flex: 1,
      height: 6,
      borderRadius: 999,
      opacity: 0.35,
    },
    themeMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    activeBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: 999,
    },
    pressed: {
      opacity: 0.92,
    },
  });
}
