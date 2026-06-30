import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { animation, colors, radius, spacing } from '@/lib/theme';

import { Button } from './Button';
import { Card } from './Card';
import { Text } from './Text';

type EmptyStateProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  /** Versão mais compacta para secções ou cards. */
  compact?: boolean;
  /** Renderiza dentro de um Card (útil em análises e secções). */
  inCard?: boolean;
  /** Chips de destaque opcionais (ex.: features do empty de ativos). */
  highlights?: string[];
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
  inCard = false,
  highlights,
}: EmptyStateProps) {
  const content = (
    <Animated.View
      entering={FadeIn.duration(animation.emptyEnter)}
      style={[
        styles.container,
        compact && styles.containerCompact,
        inCard && styles.containerInCard,
      ]}>
      <View style={[styles.iconWrapper, compact && styles.iconWrapperCompact]}>{icon}</View>
      <Text variant={compact ? 'h3' : 'h2'} align="center" style={styles.title}>
        {title}
      </Text>
      <Text variant="body" color="textSecondary" align="center" style={styles.description}>
        {description}
      </Text>
      {highlights && highlights.length > 0 ? (
        <View style={styles.highlights}>
          {highlights.map((item) => (
            <View key={item} style={styles.highlightChip}>
              <Text variant="caption" color="textSecondary">
                {item}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      {(actionLabel || secondaryActionLabel) && (
        <View style={styles.actions}>
          {actionLabel && onAction && (
            <Button
              label={actionLabel}
              onPress={onAction}
              fullWidth
              size={compact ? 'md' : 'lg'}
            />
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
    </Animated.View>
  );

  if (inCard) {
    return (
      <Card variant="outlined" padding="lg" style={styles.card}>
        {content}
      </Card>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['3xl'],
    paddingVertical: spacing['4xl'],
    gap: spacing.md,
  },
  containerCompact: {
    flex: 0,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  containerInCard: {
    flex: 0,
    paddingHorizontal: 0,
    paddingVertical: spacing.md,
  },
  card: {
    alignItems: 'stretch',
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
  highlights: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
    maxWidth: 300,
  },
  highlightChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actions: {
    width: '100%',
    maxWidth: 280,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
});
