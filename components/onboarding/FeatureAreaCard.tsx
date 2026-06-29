import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Button, Text } from '@/components/ui';
import type { FeatureRevealCard } from '@/lib/onboarding/features';
import { colors, radius, spacing } from '@/lib/theme';

type FeatureAreaCardProps = {
  feature: FeatureRevealCard;
  index?: number;
  onActivate?: () => void;
};

export function FeatureAreaCard({ feature, index = 0, onActivate }: FeatureAreaCardProps) {
  const isActive = feature.status === 'active';

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).duration(320)}>
      <View style={[styles.card, isActive ? styles.cardActive : styles.cardAvailable]}>
        <Text style={styles.emoji}>{feature.emoji}</Text>
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text variant="bodyMedium" style={isActive ? styles.titleActive : undefined}>
              {feature.label}
            </Text>
            <View style={[styles.badge, isActive ? styles.badgeActive : styles.badgeAvailable]}>
              <Text
                variant="caption"
                color={isActive ? 'primary' : 'textMuted'}
                style={styles.badgeText}>
                {isActive ? 'Ativo' : 'Disponível'}
              </Text>
            </View>
          </View>
          <Text variant="caption" color="textMuted">
            {feature.description}
          </Text>
          {!isActive && onActivate ? (
            <Button
              label="Ativar"
              variant="ghost"
              size="sm"
              onPress={onActivate}
              style={styles.activateBtn}
            />
          ) : null}
          {!isActive && !onActivate ? (
            <Text variant="caption" color="textMuted" style={styles.hint}>
              {feature.activateHint}
            </Text>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  cardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  cardAvailable: {
    borderColor: colors.border,
    backgroundColor: colors.surface,
    opacity: 0.92,
  },
  emoji: {
    fontSize: 28,
    width: 36,
    textAlign: 'center',
  },
  body: {
    flex: 1,
    gap: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  titleActive: {
    fontWeight: '700',
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  badgeActive: {
    borderColor: colors.primary,
    backgroundColor: colors.backgroundElevated,
  },
  badgeAvailable: {
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  badgeText: {
    fontWeight: '600',
    fontSize: 11,
  },
  hint: {
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  activateBtn: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    paddingHorizontal: 0,
  },
});
