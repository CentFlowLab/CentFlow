import { Pressable, StyleSheet, View } from 'react-native';

import { pressScale, spacing } from '@/lib/theme';

import { Text } from './Text';

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function SectionHeader({
  title,
  subtitle,
  actionLabel,
  onAction,
}: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.textGroup}>
        <Text variant="h3">{title}</Text>
        {subtitle && (
          <Text variant="caption" color="textMuted">
            {subtitle}
          </Text>
        )}
      </View>
      {actionLabel && onAction && (
        <Pressable
          onPress={onAction}
          hitSlop={8}
          style={({ pressed }) => pressed && styles.actionPressed}>
          <Text variant="caption" color="primary" style={styles.action}>
            {actionLabel}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  textGroup: {
    flex: 1,
    gap: spacing.xs,
  },
  action: {
    fontWeight: '600',
  },
  actionPressed: {
    opacity: 0.75,
    transform: [{ scale: pressScale.subtle }],
  },
});
