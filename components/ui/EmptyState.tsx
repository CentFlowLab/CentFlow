import { StyleSheet, View } from 'react-native';

import { radius, spacing, useThemedStyles } from '@/lib/theme';
import type { ThemeColors } from '@/lib/theme/types';

import { Button } from './Button';
import { Text } from './Text';

type EmptyStateProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  compact?: boolean;
};

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  compact = false,
}: EmptyStateProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <View style={[styles.iconWrapper, compact && styles.iconWrapperCompact]}>{icon}</View>
      <Text variant={compact ? 'h3' : 'h2'} align="center" style={styles.title}>
        {title}
      </Text>
      <Text variant="body" color="textSecondary" align="center" style={styles.description}>
        {description}
      </Text>
      {(actionLabel || secondaryActionLabel) && (
        <View style={styles.actions}>
          {actionLabel && onAction && (
            <Button label={actionLabel} onPress={onAction} fullWidth />
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button
              label={secondaryActionLabel}
              variant="ghost"
              onPress={onSecondaryAction}
              fullWidth
            />
          )}
        </View>
      )}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing['3xl'],
      paddingVertical: spacing['4xl'],
      gap: spacing.md,
    },
    containerCompact: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.xl,
      gap: spacing.sm,
    },
    iconWrapper: {
      width: 72,
      height: 72,
      borderRadius: radius.xl,
      backgroundColor: colors.primaryMuted,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    iconWrapperCompact: {
      width: 56,
      height: 56,
      marginBottom: spacing.xs,
    },
    title: {
      maxWidth: 280,
    },
    description: {
      maxWidth: 300,
      lineHeight: 22,
    },
    actions: {
      width: '100%',
      maxWidth: 280,
      marginTop: spacing.lg,
      gap: spacing.sm,
    },
  });
}
