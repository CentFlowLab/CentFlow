import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import { colors, spacing } from '@/lib/theme';

type OcrFailureCardProps = {
  message?: string;
  showOriginalNote?: boolean;
  /**
   * 'failure' — leitura falhou (tom de aviso).
   * 'info' — situação esperada e neutra (ex.: PDF), sem aspeto de erro.
   */
  variant?: 'failure' | 'info';
  title?: string;
};

export function OcrFailureCard({
  message = 'Não conseguimos ler este talão. Preenche os campos abaixo — o talão original fica anexado.',
  showOriginalNote = true,
  variant = 'failure',
  title,
}: OcrFailureCardProps) {
  const isInfo = variant === 'info';
  const resolvedTitle = title ?? (isInfo ? 'Ficheiro PDF' : 'Não conseguimos ler este talão');

  return (
    <Card variant="outlined" style={[styles.card, isInfo && styles.cardInfo]}>
      <View style={styles.row}>
        <SymbolView
          name={
            isInfo
              ? { ios: 'doc.fill', android: 'picture_as_pdf', web: 'picture_as_pdf' }
              : {
                  ios: 'doc.text.magnifyingglass',
                  android: 'document_search',
                  web: 'document_search',
                }
          }
          tintColor={isInfo ? colors.primary : colors.warning}
          size={22}
        />
        <View style={styles.text}>
          <Text variant="bodyMedium">{resolvedTitle}</Text>
          <Text variant="caption" color="textMuted">
            {message}
          </Text>
          {showOriginalNote && !isInfo ? (
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
  cardInfo: {
    borderColor: colors.border,
    backgroundColor: colors.surface,
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
