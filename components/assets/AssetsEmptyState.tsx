import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { Button, Card, Text } from '@/components/ui';
import type { AssetsEmptyConfig } from '@/components/assets/assets.config';
import { colors, radius, spacing } from '@/lib/theme';

type AssetsEmptyStateProps = {
  config: AssetsEmptyConfig;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
};

export function AssetsEmptyState({
  config,
  onPrimaryAction,
  onSecondaryAction,
}: AssetsEmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrapper}>
        <SymbolView name={config.icon} tintColor={colors.primary} size={32} />
      </View>

      <Text variant="h2" align="center" style={styles.title}>
        {config.title}
      </Text>
      <Text variant="body" color="textSecondary" align="center" style={styles.description}>
        {config.description}
      </Text>

      <Card variant="outlined" style={styles.highlightsCard}>
        {config.highlights.map((highlight) => (
          <View key={highlight} style={styles.highlightRow}>
            <SymbolView
              name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
              tintColor={colors.success}
              size={16}
            />
            <Text variant="caption" color="textSecondary" style={styles.highlightText}>
              {highlight}
            </Text>
          </View>
        ))}
      </Card>

      <View style={styles.actions}>
        {config.actionLabel && onPrimaryAction ? (
          <Button label={config.actionLabel} onPress={onPrimaryAction} fullWidth size="lg" />
        ) : null}
        {config.secondaryActionLabel && onSecondaryAction ? (
          <Button
            label={config.secondaryActionLabel}
            variant="ghost"
            onPress={onSecondaryAction}
            fullWidth
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing['2xl'],
    gap: spacing.md,
  },
  iconWrapper: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    maxWidth: 300,
  },
  description: {
    maxWidth: 320,
    lineHeight: 22,
  },
  highlightsCard: {
    width: '100%',
    maxWidth: 340,
    gap: spacing.sm,
    backgroundColor: colors.backgroundElevated,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  highlightText: {
    flex: 1,
    lineHeight: 18,
  },
  actions: {
    width: '100%',
    maxWidth: 320,
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
});
