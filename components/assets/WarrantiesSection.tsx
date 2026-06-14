import { SymbolView } from 'expo-symbols';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import type { Warranty } from '@/lib/domain/assets.types';
import { getWarrantiesSummary, sortWarrantiesByUrgency } from '@/lib/domain/warranty.utils';
import { colors, spacing } from '@/lib/theme';

import { AssetsTabToolbar } from './AssetsTabToolbar';
import { SwipeableAssetRow } from './SwipeableAssetRow';
import { WarrantiesEmptyState } from './WarrantiesEmptyState';
import { WarrantyListItem } from './WarrantyListItem';

type WarrantiesSectionProps = {
  warranties: Warranty[];
  onEdit?: (warranty: Warranty) => void;
  onLearnMore?: () => void;
  onDelete?: (warranty: Warranty) => void;
};

export function WarrantiesSection({
  warranties,
  onEdit,
  onLearnMore,
  onDelete,
}: WarrantiesSectionProps) {
  const sortedWarranties = useMemo(() => sortWarrantiesByUrgency(warranties), [warranties]);

  if (warranties.length === 0) {
    return (
      <View style={styles.container}>
        <WarrantiesEmptyState onLearnMore={onLearnMore} />
      </View>
    );
  }

  const summary = getWarrantiesSummary(warranties);

  return (
    <View style={styles.container}>
      <AssetsTabToolbar
        label={`${warranties.length} garantia${warranties.length === 1 ? '' : 's'}`}
      />

      {summary.expiringSoon > 0 || summary.expired > 0 ? (
        <Card variant="outlined" style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            {summary.expiringSoon > 0 ? (
              <View style={styles.summaryItem}>
                <SymbolView
                  name={{
                    ios: 'exclamationmark.triangle.fill',
                    android: 'warning',
                    web: 'warning',
                  }}
                  tintColor={colors.danger}
                  size={16}
                />
                <Text variant="bodyMedium" color="danger">
                  {summary.expiringSoon} a expirar em 30 dias
                </Text>
              </View>
            ) : null}
            {summary.expired > 0 ? (
              <View style={styles.summaryItem}>
                <SymbolView
                  name={{ ios: 'xmark.shield.fill', android: 'gpp_bad', web: 'gpp_bad' }}
                  tintColor={colors.textMuted}
                  size={16}
                />
                <Text variant="caption" color="textMuted">
                  {summary.expired} expirada{summary.expired === 1 ? '' : 's'}
                </Text>
              </View>
            ) : null}
          </View>
        </Card>
      ) : null}

      <View style={styles.list}>
        {sortedWarranties.map((warranty) => (
          <SwipeableAssetRow
            key={warranty.id}
            label={warranty.product}
            onDelete={() => onDelete?.(warranty)}>
            <WarrantyListItem warranty={warranty} onPress={onEdit} />
          </SwipeableAssetRow>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 280,
  },
  summaryCard: {
    marginBottom: spacing.lg,
    backgroundColor: colors.dangerMuted,
    borderColor: colors.danger,
  },
  summaryRow: {
    gap: spacing.sm,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  list: {
    flex: 1,
  },
});
