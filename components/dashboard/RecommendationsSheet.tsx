import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { RecommendationCard } from '@/components/dashboard/RecommendationCard';
import { DraggableBottomSheet } from '@/components/layout';
import { Text } from '@/components/ui';
import type { Recommendation } from '@/lib/domain/financial/recommendations';
import { colors, spacing } from '@/lib/theme';

type RecommendationsSheetProps = {
  visible: boolean;
  onClose: () => void;
  recommendations: Recommendation[];
};

export function RecommendationsSheet({
  visible,
  onClose,
  recommendations,
}: RecommendationsSheetProps) {
  return (
    <DraggableBottomSheet
      visible={visible}
      onClose={onClose}
      maxHeight="90%"
      header={(requestClose) => (
        <View style={styles.header}>
          <View>
            <Text variant="h2">Recomendações</Text>
            <Text variant="caption" color="textMuted">
              Regras determinísticas com base nos teus números reais
            </Text>
          </View>
          <Pressable onPress={requestClose} hitSlop={12} accessibilityLabel="Fechar">
            <SymbolView
              name={{ ios: 'xmark.circle.fill', android: 'close', web: 'close' }}
              tintColor={colors.textMuted}
              size={28}
            />
          </Pressable>
        </View>
      )}>
      {recommendations.length > 0 ? (
        <View style={styles.list}>
          {recommendations.map((item) => (
            <RecommendationCard key={item.id} recommendation={item} />
          ))}
        </View>
      ) : (
        <View style={styles.empty}>
          <SymbolView
            name={{ ios: 'checkmark.seal.fill', android: 'verified', web: 'verified' }}
            tintColor={colors.success}
            size={32}
          />
          <Text variant="bodyMedium" align="center">
            Sem recomendações activas
          </Text>
          <Text variant="caption" color="textSecondary" align="center">
            Quando uma regra detectar oportunidade, aparece aqui com os números que a originaram.
          </Text>
        </View>
      )}
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
  list: {
    paddingBottom: spacing.xl,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing['2xl'],
    paddingHorizontal: spacing.lg,
  },
});
