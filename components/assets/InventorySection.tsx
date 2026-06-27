import { StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import { useOnboardingAnswers } from '@/hooks/queries/useOnboardingAnswers';
import type { InventoryItem } from '@/lib/domain/types';
import { getPersonalizedEmptyStateCopy } from '@/lib/onboarding/personalization';
import { colors, spacing } from '@/lib/theme';
import { formatCurrency } from '@/lib/utils/format';

import { ASSETS_EMPTY_CONFIG } from './assets.config';
import { AssetsEmptyState } from './AssetsEmptyState';
import { InventoryListItem } from './InventoryListItem';
import { SwipeableAssetRow } from './SwipeableAssetRow';

type InventorySectionProps = {
  inventory: InventoryItem[];
  onEdit?: (item: InventoryItem) => void;
  onLearnMore?: () => void;
  onDelete?: (item: InventoryItem) => void;
};

export function InventorySection({
  inventory,
  onEdit,
  onLearnMore,
  onDelete,
}: InventorySectionProps) {
  const { data: answers } = useOnboardingAnswers();
  const personalized = getPersonalizedEmptyStateCopy('inventario', answers ?? null);

  const baseConfig = ASSETS_EMPTY_CONFIG.inventario;
  const emptyConfig = {
    ...baseConfig,
    title: personalized.title || baseConfig.title,
    description: personalized.description || baseConfig.description,
    actionLabel: personalized.actionLabel || baseConfig.actionLabel,
  };

  const totalValue = inventory.reduce((sum, item) => sum + item.value, 0);

  if (inventory.length === 0) {
    return (
      <View style={styles.container}>
        <AssetsEmptyState
          config={emptyConfig}
          onSecondaryAction={onLearnMore}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Card variant="outlined" style={styles.summaryCard}>
        <Text variant="caption" color="textMuted">
          Valor total estimado
        </Text>
        <Text variant="h3" color="success">
          {formatCurrency(totalValue)}
        </Text>
      </Card>

      <View style={styles.list}>
        {inventory.map((item) => (
          <SwipeableAssetRow
            key={item.id}
            label={item.name}
            onDelete={() => onDelete?.(item)}>
            <InventoryListItem item={item} onPress={onEdit} />
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
    gap: spacing.xs,
    marginBottom: spacing.lg,
    backgroundColor: colors.backgroundElevated,
  },
  list: {
    flex: 1,
  },
});
