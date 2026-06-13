import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import type { ProfileDimension } from '@/lib/domain/financial-profile.types';
import { colors, radius, spacing } from '@/lib/theme';

import { PROFILE_DIMENSION_ICONS, getProfileProgressColor } from './financial-profile.config';

type FinancialProfileDimensionRowProps = {
  dimension: ProfileDimension;
  showDescription?: boolean;
};

export function FinancialProfileDimensionRow({
  dimension,
  showDescription = true,
}: FinancialProfileDimensionRowProps) {
  const fillPercent = (dimension.weight / dimension.maxWeight) * 100;

  return (
    <View style={styles.row}>
      <View
        style={[
          styles.statusIcon,
          dimension.completed ? styles.statusComplete : styles.statusPending,
        ]}>
        <SymbolView
          name={
            dimension.completed
              ? { ios: 'checkmark', android: 'check', web: 'check' }
              : PROFILE_DIMENSION_ICONS[dimension.id]
          }
          tintColor={dimension.completed ? colors.success : colors.textMuted}
          size={16}
        />
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text variant="bodyMedium">{dimension.label}</Text>
          <Text variant="caption" color={dimension.completed ? 'success' : 'textMuted'}>
            {dimension.weight}/{dimension.maxWeight}%
          </Text>
        </View>

        {showDescription ? (
          <Text variant="caption" color="textMuted">
            {dimension.completed ? dimension.description : dimension.actionHint}
          </Text>
        ) : null}

        <View style={styles.track}>
          {dimension.completed ? (
            <LinearGradient
              colors={[colors.success, colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.fill, { width: `${fillPercent}%` }]}
            />
          ) : (
            <View style={[styles.fillMuted, { width: `${Math.max(fillPercent, 4)}%` }]} />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  statusIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusComplete: {
    backgroundColor: colors.successMuted,
    borderWidth: 1,
    borderColor: colors.success,
  },
  statusPending: {
    backgroundColor: colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  content: {
    flex: 1,
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  track: {
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceHighlight,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  fill: {
    height: '100%',
    borderRadius: radius.full,
  },
  fillMuted: {
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: colors.surfaceHighlight,
  },
});
