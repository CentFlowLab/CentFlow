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
import { colors, radius, spacing } from '@/lib/theme';

export default function AppearanceScreen() {
  const { data: preferences, isLoading } = useUserPreferences();
  const updatePreferences = useUpdatePreferences();
  const { showToast } = useToast();

  const activeTheme = THEME_OPTIONS.find((item) => item.id === preferences?.themeId) ?? THEME_OPTIONS[0];
  const upcomingThemes = THEME_OPTIONS.filter((item) => !item.available);

  async function handleSelectTheme(themeId: ThemeId) {
    const theme = THEME_OPTIONS.find((item) => item.id === themeId);
    if (!theme?.available) {
      showToast('Este tema estará disponível em breve.', 'info');
      return;
    }

    try {
      await updatePreferences.mutateAsync({ themeId });
      showToast(`Tema "${theme.name}" ativo.`, 'success');
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
    <SettingsScreenLayout title="Aparência" subtitle="Tema visual da aplicação">
      <SettingsHero
        icon={{ ios: 'paintbrush.fill', android: 'palette', web: 'palette' }}
        title="Tema atual"
        description="Dark Premium é o visual ativo da CentFlow."
      />

      <Pressable
        onPress={() => handleSelectTheme(activeTheme.id)}
        style={({ pressed }) => [pressed && styles.pressed]}>
        <Card variant="elevated" style={[styles.themeCard, styles.themeCardActive]}>
          <View style={styles.themeHeader}>
            <Text variant="bodyMedium">{activeTheme.name}</Text>
            <View style={styles.activeBadge}>
              <Text variant="caption" color="primary">
                Ativo
              </Text>
            </View>
          </View>
          <Text variant="caption" color="textMuted">
            {activeTheme.description}
          </Text>
          <View style={styles.previewRow}>
            {activeTheme.preview.map((color, index) => (
              <View
                key={`${activeTheme.id}-${index}`}
                style={[styles.previewSwatch, { backgroundColor: color }]}
              />
            ))}
          </View>
        </Card>
      </Pressable>

      {upcomingThemes.length > 0 ? (
        <View style={styles.upcomingBlock}>
          <Text variant="label" color="textMuted">
            Em breve
          </Text>
          {upcomingThemes.map((theme) => (
            <Card key={theme.id} variant="outlined" style={styles.upcomingCard}>
              <View style={styles.upcomingRow}>
                <Text variant="caption" color="textSecondary">
                  {theme.name}
                </Text>
                <Text variant="caption" color="textMuted">
                  {theme.description}
                </Text>
              </View>
            </Card>
          ))}
        </View>
      ) : null}
    </SettingsScreenLayout>
  );
}

const styles = StyleSheet.create({
  themeCard: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  themeCardActive: {
    borderColor: colors.primary,
  },
  themeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.primaryMuted,
  },
  previewRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  previewSwatch: {
    flex: 1,
    height: 28,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  upcomingBlock: {
    gap: spacing.sm,
  },
  upcomingCard: {
    paddingVertical: spacing.sm,
  },
  upcomingRow: {
    gap: spacing.xs,
  },
  pressed: {
    opacity: 0.9,
  },
});
