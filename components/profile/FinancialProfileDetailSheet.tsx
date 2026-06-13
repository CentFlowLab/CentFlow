import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { DraggableBottomSheet } from '@/components/layout';
import { Card, Text } from '@/components/ui';
import type { FinancialProfileResult } from '@/lib/domain/financial-profile.types';
import { colors, radius, spacing } from '@/lib/theme';

import { FinancialProfileDimensionRow } from './FinancialProfileDimensionRow';
import { PROFILE_LEVELS, getProfileProgressColor } from './financial-profile.config';

type FinancialProfileDetailSheetProps = {
  visible: boolean;
  profile?: FinancialProfileResult;
  onClose: () => void;
};

export function FinancialProfileDetailSheet({
  visible,
  profile,
  onClose,
}: FinancialProfileDetailSheetProps) {
  if (!profile) return null;

  const progressColor = getProfileProgressColor(profile.score);
  const completedCount = profile.dimensions.filter((d) => d.completed).length;

  return (
    <DraggableBottomSheet
      visible={visible}
      onClose={onClose}
      maxHeight="90%"
      header={(requestClose) => (
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text variant="h2">Perfil Financeiro</Text>
            <Text variant="caption" color="textMuted">
              {completedCount} de {profile.dimensions.length} áreas completas
            </Text>
          </View>
          <Pressable
            onPress={requestClose}
            hitSlop={12}
            accessibilityLabel="Fechar"
            style={styles.closeButton}>
            <SymbolView
              name={{ ios: 'xmark', android: 'close', web: 'close' }}
              tintColor={colors.textMuted}
              size={20}
            />
          </Pressable>
        </View>
      )}>
      <Card variant="elevated" padding="md" style={styles.summaryCard}>
        <View style={styles.summaryTop}>
          <View>
            <Text variant="display" style={{ color: progressColor }}>
              {profile.score}%
            </Text>
            <Text variant="bodyMedium">{profile.levelTitle}</Text>
            <Text variant="caption" color="textSecondary">
              {profile.levelLabel}
            </Text>
          </View>
          <View style={[styles.summaryBadge, { backgroundColor: `${progressColor}22` }]}>
            <SymbolView
              name={{
                ios: profile.level >= 3 ? 'crown.fill' : 'star.fill',
                android: profile.level >= 3 ? 'workspace_premium' : 'star',
                web: profile.level >= 3 ? 'workspace_premium' : 'star',
              }}
              tintColor={progressColor}
              size={28}
            />
          </View>
        </View>

        <View style={styles.summaryTrack}>
          <LinearGradient
            colors={[progressColor, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.summaryFill, { width: `${profile.score}%` }]}
          />
        </View>

        {profile.nextLevel ? (
          <Text variant="caption" color="textSecondary">
            Faltam {profile.pointsToNextLevel}% para desbloquear o Nível {profile.nextLevel}
          </Text>
        ) : (
          <Text variant="caption" color="success">
            Perfil completo — todas as funcionalidades desbloqueadas
          </Text>
        )}
      </Card>

      <Text variant="label" color="textMuted" style={styles.sectionTitle}>
        Áreas de progresso
      </Text>
      <Card variant="outlined" padding="md">
        {profile.dimensions.map((dimension, index) => (
          <View key={dimension.id}>
            <FinancialProfileDimensionRow dimension={dimension} />
            {index < profile.dimensions.length - 1 ? (
              <View style={styles.divider} />
            ) : null}
          </View>
        ))}
      </Card>

      <Text variant="label" color="textMuted" style={styles.sectionTitle}>
        Níveis e desbloqueios
      </Text>
      {PROFILE_LEVELS.map((levelInfo) => {
        const unlocked = profile.level >= levelInfo.level;
        return (
          <Card
            key={levelInfo.level}
            variant={unlocked ? 'elevated' : 'outlined'}
            padding="md"
            style={[styles.levelCard, unlocked && styles.levelCardUnlocked]}>
            <View style={styles.levelHeader}>
              <View style={styles.levelTitleRow}>
                <SymbolView
                  name={{
                    ios: unlocked ? 'checkmark.seal.fill' : 'lock.fill',
                    android: unlocked ? 'verified' : 'lock',
                    web: unlocked ? 'verified' : 'lock',
                  }}
                  tintColor={unlocked ? colors.success : colors.textMuted}
                  size={18}
                />
                <Text variant="bodyMedium">{levelInfo.label}</Text>
              </View>
              <Text variant="caption" color="textMuted">
                {levelInfo.minScore}%+
              </Text>
            </View>
            <Text variant="caption" color="textSecondary" style={styles.levelSubtitle}>
              {levelInfo.title}
            </Text>
            <View style={styles.featureList}>
              {levelInfo.features.map((feature) => (
                <View key={feature} style={styles.featureItem}>
                  <SymbolView
                    name={{
                      ios: unlocked ? 'checkmark.circle.fill' : 'circle',
                      android: unlocked ? 'check_circle' : 'radio_button_unchecked',
                      web: unlocked ? 'check_circle' : 'radio_button_unchecked',
                    }}
                    tintColor={unlocked ? colors.success : colors.textMuted}
                    size={12}
                  />
                  <Text variant="caption" color={unlocked ? 'textSecondary' : 'textMuted'}>
                    {feature}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        );
      })}

      {profile.pendingDimensions.length > 0 ? (
        <>
          <Text variant="label" color="textMuted" style={styles.sectionTitle}>
            Próximos passos
          </Text>
          <Card variant="outlined" padding="md">
            {profile.pendingDimensions.map((dimension, index) => (
              <View key={dimension.id}>
                <View style={styles.nextStep}>
                  <Text variant="bodyMedium">{dimension.label}</Text>
                  <Text variant="caption" color="accent">
                    +{dimension.maxWeight}%
                  </Text>
                </View>
                <Text variant="caption" color="textMuted">
                  {dimension.actionHint}
                </Text>
                {index < profile.pendingDimensions.length - 1 ? (
                  <View style={styles.divider} />
                ) : null}
              </View>
            ))}
          </Card>
        </>
      ) : null}

      <View style={styles.footerSpacer} />
    </DraggableBottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
  },
  summaryCard: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  summaryBadge: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTrack: {
    height: 10,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceHighlight,
    overflow: 'hidden',
  },
  summaryFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  sectionTitle: {
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  levelCard: {
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  levelCardUnlocked: {
    borderColor: colors.primary,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  levelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  levelSubtitle: {
    marginLeft: spacing.xl,
  },
  featureList: {
    marginLeft: spacing.xl,
    gap: spacing.xs,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  nextStep: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  footerSpacer: {
    height: spacing.xl,
  },
});
