import { SymbolView } from 'expo-symbols';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import { colors, spacing } from '@/lib/theme';

type ReceiptOcrProcessingOverlayProps = {
  phaseLabel: string;
};

export function ReceiptOcrProcessingOverlay({
  phaseLabel,
}: ReceiptOcrProcessingOverlayProps) {
  return (
    <Card variant="outlined" style={styles.card}>
      <View style={styles.row}>
        <ActivityIndicator color={colors.primary} size="small" />
        <View style={styles.text}>
          <Text variant="bodyMedium">A analisar o talão</Text>
          <Text variant="caption" color="textMuted">
            {phaseLabel}
          </Text>
        </View>
        <SymbolView
          name={{ ios: 'doc.text.viewfinder', android: 'document_scanner', web: 'document_scanner' }}
          tintColor={colors.primary}
          size={22}
        />
      </View>
      <Text variant="caption" color="textSecondary">
        Mantém o ecrã aberto — em segundos vais poder rever e corrigir os dados.
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    borderColor: colors.primaryMuted,
    backgroundColor: colors.backgroundElevated,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  text: {
    flex: 1,
    gap: 2,
  },
});
