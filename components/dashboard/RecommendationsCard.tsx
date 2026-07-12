import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { RecommendationCard } from '@/components/dashboard/RecommendationCard';
import { RecommendationsSheet } from '@/components/dashboard/RecommendationsSheet';
import { SectionHeader, Text } from '@/components/ui';
import { useFinancialRecommendations } from '@/hooks/useFinancialRecommendations';
import { spacing } from '@/lib/theme';

type RecommendationsCardProps = {
  maxVisible?: number;
};

export function RecommendationsCard({ maxVisible = 3 }: RecommendationsCardProps) {
  const recommendations = useFinancialRecommendations();
  const [sheetVisible, setSheetVisible] = useState(false);

  const visible = recommendations.slice(0, maxVisible);
  if (visible.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <SectionHeader title="Recomendações" />
        {recommendations.length > maxVisible ? (
          <Pressable onPress={() => setSheetVisible(true)} hitSlop={8}>
            <Text variant="caption" color="primary">
              Ver todas ({recommendations.length})
            </Text>
          </Pressable>
        ) : recommendations.length > 0 ? (
          <Pressable onPress={() => setSheetVisible(true)} hitSlop={8}>
            <Text variant="caption" color="primary">
              Ver todas
            </Text>
          </Pressable>
        ) : null}
      </View>

      {visible.map((item) => (
        <RecommendationCard key={item.id} recommendation={item} />
      ))}

      <RecommendationsSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        recommendations={recommendations}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
});
