import { Pressable, StyleSheet, View } from 'react-native';

import { SettingsHero, SettingsScreenLayout } from '@/components/settings/SettingsScreenLayout';
import { Card, Text } from '@/components/ui';
import { colors, radius, spacing } from '@/lib/theme';

const THEMES = [
  {
    id: 'dark-premium',
    name: 'Dark Premium',
    description: 'Teal e gold — tema atual da CentFlow',
    active: true,
    preview: [colors.background, colors.surface, colors.primary],
  },
  {
    id: 'dark-classic',
    name: 'Dark Classic',
    description: 'Em breve — tons mais neutros',
    active: false,
    preview: ['#0B0B0F', '#17171C', '#8B8B9A'],
  },
] as const;

export default function AppearanceScreen() {
  return (
    <SettingsScreenLayout title="Aparência" subtitle="Tema visual da aplicação">
      <SettingsHero
        icon={{ ios: 'paintbrush.fill', android: 'palette', web: 'palette' }}
        title="Personaliza o visual"
        description="O tema Dark Premium está activo em toda a app."
      />

      {THEMES.map((theme) => (
        <Pressable
          key={theme.id}
          disabled={!theme.active}
          style={({ pressed }) => [pressed && theme.active && styles.pressed]}>
          <Card
            variant={theme.active ? 'elevated' : 'outlined'}
            style={[styles.themeCard, theme.active && styles.themeCardActive]}>
            <View style={styles.themeHeader}>
              <Text variant="bodyMedium">{theme.name}</Text>
              {theme.active ? (
                <View style={styles.activeBadge}>
                  <Text variant="caption" color="primary">
                    Activo
                  </Text>
                </View>
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
      ))}
    </SettingsScreenLayout>
  );
}

const styles = StyleSheet.create({
  themeCard: {
    gap: spacing.sm,
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
