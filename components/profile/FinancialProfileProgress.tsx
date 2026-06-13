import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Card, Text } from '@/components/ui';
import type { FinancialProfileResult, ProfileDimensionId } from '@/lib/domain/financial-profile.types';
import { colors, radius, spacing } from '@/lib/theme';

type FinancialProfileProgressProps = {
  profile?: FinancialProfileResult;
  isLoading?: boolean;
  variant?: 'full' | 'compact';
  style?: StyleProp<ViewStyle>;
};

const DIMENSION_ICONS: Record<ProfileDimensionId, SymbolViewProps['name']> = {
  transactions: { ios: 'list.bullet', android: 'receipt_long', web: 'receipt_long' },
  receipts: { ios: 'doc.text.viewfinder', android: 'document_scanner', web: 'document_scanner' },
  goals: { ios: 'target', android: 'flag', web: 'flag' },
  assets: { ios: 'shippingbox.fill', android: 'inventory_2', web: 'inventory_2' },
  patrimony: { ios: 'banknote.fill', android: 'account_balance', web: 'account_balance' },
};

export function FinancialProfileProgress({
  profile,
  isLoading = false,
  variant = 'full',
  style,
}: FinancialProfileProgressProps) {
  if (isLoading || !profile) {
    return (
      <Card variant="elevated" style={[styles.card, style]}>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
          <Text variant="caption" color="textMuted">
            A calcular o teu perfil financeiro...
          </Text>
        </View>
      </Card>
    );
  }

  const progressColor = getProgressColor(profile.score);
  const showPending = variant === 'full';
  const pendingPreview = profile.pendingDimensions.slice(0, variant === 'compact' ? 2 : 5);

  return (
    <Card variant="elevated" style={[styles.card, style]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text variant="label" color="textMuted">
            Perfil Financeiro
          </Text>
          <View style={styles.scoreRow}>
            <Text variant="h1" style={{ color: progressColor }}>
              {profile.score}%
            </Text>
            <View style={[styles.levelBadge, { backgroundColor: `${progressColor}20` }]}>
              <Text variant="caption" style={{ color: progressColor }}>
                {profile.levelLabel}
              </Text>
            </View>
          </View>
          <Text variant="bodyMedium">{profile.levelTitle}</Text>
        </View>
        <SymbolView
          name={{
            ios: profile.level >= 3 ? 'sparkles' : profile.level >= 2 ? 'chart.bar.fill' : 'lightbulb.fill',
            android: profile.level >= 3 ? 'auto_awesome' : profile.level >= 2 ? 'bar_chart' : 'lightbulb',
            web: profile.level >= 3 ? 'auto_awesome' : profile.level >= 2 ? 'bar_chart' : 'lightbulb',
          }}
          tintColor={progressColor}
          size={28}
        />
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${profile.score}%`, backgroundColor: progressColor },
          ]}
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

      {variant === 'compact' ? (
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

      {showPending && pendingPreview.length > 0 ? (
        <View style={styles.pendingSection}>
          <Text variant="label" color="textMuted" style={styles.sectionLabel}>
            Para subir de nível
          </Text>
          {pendingPreview.map((dimension) => (
            <View key={dimension.id} style={styles.pendingItem}>
              <View style={styles.pendingIcon}>
                <SymbolView
                  name={DIMENSION_ICONS[dimension.id]}
                  tintColor={colors.textMuted}
                  size={16}
                />
              </View>
              <View style={styles.pendingText}>
                <Text variant="bodyMedium">{dimension.label}</Text>
                <Text variant="caption" color="textMuted">
                  {dimension.actionHint}
                </Text>
              </View>
              <Text variant="caption" color="accent">
                +{dimension.maxWeight}%
              </Text>
            </View>
          ))}
          {profile.pendingDimensions.length > pendingPreview.length ? (
            <Text variant="caption" color="textMuted" align="center">
              +{profile.pendingDimensions.length - pendingPreview.length} área
              {profile.pendingDimensions.length - pendingPreview.length === 1 ? '' : 's'} por completar
            </Text>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

type UnlockChipProps = {
  label: string;
  unlocked: boolean;
};

function UnlockChip({ label, unlocked }: UnlockChipProps) {
  return (
    <View
      style={[
        styles.chip,
        unlocked ? styles.chipUnlocked : styles.chipLocked,
      ]}>
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

function getProgressColor(score: number): string {
  if (score >= 60) return colors.success;
  if (score >= 30) return colors.primary;
  return colors.accent;
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  loading: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
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
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  levelBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  progressTrack: {
    height: 8,
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
    gap: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pendingItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  pendingIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingText: {
    flex: 1,
    gap: 2,
  },
});
