import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import { OCR_READ_FAILURE_MESSAGE } from '@/lib/receipt/ocr-messages';
import { colors, spacing } from '@/lib/theme';

type OcrFailureCardProps = {
  message?: string;
  showOriginalNote?: boolean;
};

export function OcrFailureCard({
  message = OCR_READ_FAILURE_MESSAGE,
  showOriginalNote = true,
}: OcrFailureCardProps) {
  return (
    <Card variant="outlined" style={styles.card}>
      <View style={styles.row}>
        <SymbolView
          name={{
            ios: 'doc.text.magnifyingglass',
            android: 'document_search',
            web: 'document_search',
          }}
          tintColor={colors.warning}
          size={22}
        />
        <View style={styles.text}>
          <Text variant="bodyMedium">{OCR_READ_FAILURE_MESSAGE}</Text>
          <Text variant="caption" color="textMuted">
            {message}
          </Text>
          {showOriginalNote ? (
            <Text variant="caption" color="textSecondary" style={styles.note}>
              O talão original fica sempre anexado ao movimento — podes preencher os campos
              manualmente e guardar.
            </Text>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderColor: colors.warning,
    backgroundColor: colors.accentMuted,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  text: {
    flex: 1,
    gap: spacing.xs,
  },
  note: {
    marginTop: spacing.xs,
  },
});
