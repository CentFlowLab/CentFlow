import { SymbolView } from 'expo-symbols';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button, Text } from '@/components/ui';
import type { ReceiptDraft } from '@/lib/domain/receipt.types';
import { colors, spacing } from '@/lib/theme';

import { ReceiptPreview } from './ReceiptPreview';

type ReceiptAttachmentFieldProps = {
  draft: ReceiptDraft | null;
  isPicking: boolean;
  isPreprocessing?: boolean;
  pickError?: string | null;
  onPick: () => void;
  onRemove: () => void;
};

export function ReceiptAttachmentField({
  draft,
  isPicking,
  isPreprocessing = false,
  pickError,
  onPick,
  onRemove,
}: ReceiptAttachmentFieldProps) {
  const busy = isPicking || isPreprocessing;
  return (
    <View style={styles.container}>
      <Text variant="caption" color="textSecondary" style={styles.label}>
        Talão / fatura
      </Text>

      {draft ? (
        <>
          <ReceiptPreview draft={draft} onRemove={onRemove} />
          {draft.preprocessed ? (
            <Text variant="caption" color="textMuted">
              Imagem optimizada para OCR ({draft.width ?? '?'}×{draft.height ?? '?'}px)
            </Text>
          ) : null}
        </>
      ) : (
        <Button
          label={
            isPreprocessing
              ? 'A optimizar imagem...'
              : isPicking
                ? 'A abrir...'
                : 'Digitalizar talão'
          }
          variant="secondary"
          onPress={onPick}
          disabled={busy}
          fullWidth
          icon={
            busy ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <SymbolView
                name={{
                  ios: 'doc.text.viewfinder',
                  android: 'document_scanner',
                  web: 'document_scanner',
                }}
                tintColor={colors.primary}
                size={18}
              />
            )
          }
        />
      )}

      {!draft && (
        <Text variant="caption" color="textMuted">
          Dica: boa iluminação, talão plano, texto focado e enquadrado. A app optimiza
          contraste e orientação antes do OCR.
        </Text>
      )}

      {pickError ? (
        <Text variant="caption" color="danger">
          {pickError}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  label: {
    fontWeight: '500',
  },
});
