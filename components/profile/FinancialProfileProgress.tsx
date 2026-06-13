import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Card, Skeleton, SkeletonGroup, Text } from '@/components/ui';
import type { FinancialProfileResult } from '@/lib/domain/financial-profile.types';
import { colors, radius, spacing } from '@/lib/theme';

import { FinancialProfileDimensionRow } from './FinancialProfileDimensionRow';
import { getProfileProgressColor } from './financial-profile.config';

type FinancialProfileProgressProps = {
  profile?: FinancialProfileResult;
  isLoading?: boolean;
  variant?: 'full' | 'compact';
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
};

export function FinancialProfileProgress({
  profile,
  isLoading = false,
  variant = 'full',
  style,
  onPress,
}: FinancialProfileProgressProps) {
  if (isLoading || !profile) {
    return (
      <Card variant="elevated" style={[styles.card, style]}>
        <Skeleton width="55%" height={12} />
        <Skeleton width="100%" height={8} style={styles.loadingBar} />
        <SkeletonGroup gap={spacing.sm} style={styles.loadingRows}>
          <Skeleton width="100%" height={36} />
          <Skeleton width="100%" height={36} />
        </SkeletonGroup>
      </Card>
    );
  }

  const progressColor = getProfileProgressColor(profile.score);
  const isCompact = variant === 'compact';
  const pendingPreview = profile.pendingDimensions.slice(0, isCompact ? 2 : 3);
  const completedCount = profile.dimensions.filter((d) => d.completed).length;

  const content = (
    <>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.titleRow}>
            <Text variant="label" color="textMuted">
              Perfil Financeiro
            </Text>
            <View style={[styles.levelPill, { borderColor: `${progressColor}55` }]}>
              <SymbolView
                name={{
                  ios: profile.level >= 3 ? 'crown.fill' : 'star.fill',
                  android: profile.level >= 3 ? 'workspace_premium' : 'star',
                  web: profile.level >= 3 ? 'workspace_premium' : 'star',
                }}
                tintColor={progressColor}
                size={12}
              />
              <Text variant="caption" style={{ color: progressColor }}>
                {profile.levelLabel}
              </Text>
            </View>
          </View>

          <View style={styles.scoreRow}>
            <Text variant={isCompact ? 'h1' : 'display'} style={{ color: progressColor }}>
              {profile.score}%
            </Text>
            {!isCompact ? (
              <Text variant="caption" color="textMuted">
                {completedCount}/{profile.dimensions.length} áreas
              </Text>
            ) : null}
          </View>
          <Text variant="bodyMedium">{profile.levelTitle}</Text>
        </View>

        <View style={[styles.iconBadge, { backgroundColor: `${progressColor}22` }]}>
          <SymbolView
            name={{
              ios: profile.level >= 3 ? 'sparkles' : profile.level >= 2 ? 'chart.bar.fill' : 'lightbulb.fill',
              android: profile.level >= 3 ? 'auto_awesome' : profile.level >= 2 ? 'bar_chart' : 'lightbulb',
              web: profile.level >= 3 ? 'auto_awesome' : profile.level >= 2 ? 'bar_chart' : 'lightbulb',
            }}
            tintColor={progressColor}
            size={isCompact ? 22 : 28}
          />
        </View>
      </View>

      <View style={styles.progressTrack}>
        <LinearGradient
          colors={[progressColor, colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.progressFill, { width: `${profile.score}%` }]}
        />
      </View>

      {profile.nextLevel ? (
        <Text variant="caption" color="textSecondary">
          Faltam {profile.pointsToNextLevel}% para o Nível {profile.nextLevel}
        </Text>
      ) : (
        <Text variant="caption" color="success">
          Perfil completo — Assistente CentFlow desbloqueado
        </Text>
      )}

      {isCompact ? (
        <View style={styles.unlockRow}>
          {profile.unlockedFeatures.slice(0, 2).map((feature) => (
            <UnlockChip key={feature} label={feature} unlocked />
          ))}
          {profile.lockedFeatures[0] ? (
            <UnlockChip label={profile.lockedFeatures[0]} unlocked={false} />
          ) : null}
        </View>
      ) : (
        <View style={styles.featuresSection}>
          <Text variant="label" color="textMuted" style={styles.sectionLabel}>
            Desbloqueado neste nível
          </Text>
          <View style={styles.unlockRow}>
            {profile.unlockedFeatures.map((feature) => (
              <UnlockChip key={feature} label={feature} unlocked />
            ))}
          </View>
          {profile.lockedFeatures.length > 0 ? (
            <>
              <Text variant="label" color="textMuted" style={styles.sectionLabel}>
                Próximos desbloqueios
              </Text>
              <View style={styles.unlockRow}>
                {profile.lockedFeatures.map((feature) => (
                  <UnlockChip key={feature} label={feature} unlocked={false} />
                ))}
              </View>
            </>
          ) : null}
        </View>
      )}

      {!isCompact && pendingPreview.length > 0 ? (
        <View style={styles.pendingSection}>
          <Text variant="label" color="textMuted" style={styles.sectionLabel}>
            Para subir de nível
          </Text>
          {pendingPreview.map((dimension) => (
            <FinancialProfileDimensionRow
              key={dimension.id}
              dimension={dimension}
              showDescription={false}
            />
          ))}
          {profile.pendingDimensions.length > pendingPreview.length ? (
            <Text variant="caption" color="textMuted" align="center">
              +{profile.pendingDimensions.length - pendingPreview.length} área
              {profile.pendingDimensions.length - pendingPreview.length === 1 ? '' : 's'} por completar
            </Text>
          ) : null}
        </View>
      ) : null}

      {onPress ? <DetailLink isCompact={isCompact} /> : null}
    </>
  );

  const card = (
    <View style={[styles.wrapper, style]}>
      <LinearGradient
        colors={['rgba(45,212,191,0.18)', 'rgba(20,184,166,0.06)', 'rgba(5,8,14,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.glow}
      />
      <Card variant="elevated" style={styles.card}>
        {content}
      </Card>
    </View>
  );

  if (!onPress) return card;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Perfil financeiro ${profile.score} por cento. Ver detalhe completo.`}>
      {card}
    </Pressable>
  );
}

type DetailLinkProps = {
  isCompact: boolean;
};

function DetailLink({ isCompact }: DetailLinkProps) {
  return (
    <View style={styles.detailLink}>
      <Text variant="caption" color="primary">
        {isCompact ? 'Ver progresso completo' : 'Ver detalhe de todas as áreas'}
      </Text>
      <SymbolView
        name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
        tintColor={colors.primary}
        size={14}
      />
    </View>
  );
}

type UnlockChipProps = {
  label: string;
  unlocked: boolean;
};

function UnlockChip({ label, unlocked }: UnlockChipProps) {
  return (
    <View style={[styles.chip, unlocked ? styles.chipUnlocked : styles.chipLocked]}>
      <SymbolView
        name={{
          ios: unlocked ? 'checkmark.circle.fill' : 'lock.fill',
          android: unlocked ? 'check_circle' : 'lock',
          web: unlocked ? 'check_circle' : 'lock',
        }}
        tintColor={unlocked ? colors.success : colors.textMuted}
        size={12}
      />
      <Text variant="caption" color={unlocked ? 'textSecondary' : 'textMuted'}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  glow: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.xl,
    transform: [{ scale: 1.02 }],
  },
  card: {
    gap: spacing.md,
    borderColor: colors.borderStrong,
  },
  loadingBar: {
    marginTop: spacing.sm,
  },
  loadingRows: {
    marginTop: spacing.sm,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerLeft: {
    flex: 1,
    gap: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  levelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    backgroundColor: colors.surfaceHighlight,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  iconBadge: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    height: 10,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceHighlight,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  featuresSection: {
    gap: spacing.sm,
  },
  sectionLabel: {
    marginTop: spacing.xs,
  },
  unlockRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  chipUnlocked: {
    borderColor: colors.border,
    backgroundColor: colors.successMuted,
  },
  chipLocked: {
    borderColor: colors.border,
    backgroundColor: colors.surfaceHighlight,
  },
  pendingSection: {
    gap: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  detailLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
