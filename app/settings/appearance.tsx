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

  async function handleSelectTheme(themeId: ThemeId) {
    const theme = THEME_OPTIONS.find((item) => item.id === themeId);
    if (!theme?.available) {
      showToast('Este tema estará disponível em breve.', 'info');
      return;
    }

    try {
      await updatePreferences.mutateAsync({ themeId });
      showToast(`Tema "${theme.name}" activo.`, 'success');
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
        title="Personaliza o visual"
        description="A tua preferência fica guardada para quando novos temas estiverem disponíveis."
      />

      {THEME_OPTIONS.map((theme) => {
        const isActive = preferences.themeId === theme.id;
        return (
          <Pressable
            key={theme.id}
            onPress={() => handleSelectTheme(theme.id)}
            style={({ pressed }) => [pressed && styles.pressed]}>
            <Card
              variant={isActive ? 'elevated' : 'outlined'}
              style={[styles.themeCard, isActive && styles.themeCardActive]}>
              <View style={styles.themeHeader}>
                <Text variant="bodyMedium">{theme.name}</Text>
                {isActive ? (
                  <View style={styles.activeBadge}>
                    <Text variant="caption" color="primary">
                      Activo
                    </Text>
                  </View>
                ) : !theme.available ? (
                  <Text variant="caption" color="textMuted">
                    Em breve
                  </Text>
                ) : null}
              </View>
              <Text variant="caption" color="textMuted">
                {theme.description}
              </Text>
              <View style={styles.previewRow}>
                {theme.preview.map((color, index) => (
                  <View
                    key={`${theme.id}-${index}`}
                    style={[styles.previewSwatch, { backgroundColor: color }]}
                  />
                ))}
              </View>
            </Card>
          </Pressable>
        );
      })}
    </SettingsScreenLayout>
  );
}

const styles = StyleSheet.create({
  themeCard: {
    gap: spacing.sm,
    marginBottom: spacing.md,
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
  pressed: {
    opacity: 0.9,
  },
});
