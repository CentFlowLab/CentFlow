import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, Text } from '@/components/ui';
import {
  formValuesToConfirmation,
  ocrToFormValues,
} from '@/lib/domain/receipt-confirmation';
import { receiptConfirmationSchema } from '@/lib/domain/receipt-confirmation.schema';
import type { ProcessedReceipt, ReceiptFormValues } from '@/lib/domain/receipt.types';
import { getApiErrorMessage } from '@/lib/api/errors';
import { colors, radius, spacing } from '@/lib/theme';

import { OcrResultCard } from './OcrResultCard';
import { ReceiptDataForm } from './ReceiptDataForm';
import { ReceiptPreview } from './ReceiptPreview';

type ConfirmReceiptModalProps = {
  visible: boolean;
  processed: ProcessedReceipt | null;
  onClose: () => void;
  onConfirm: (processed: ProcessedReceipt, values: ReceiptFormValues) => Promise<void>;
  onFillManually: (processed: ProcessedReceipt, values: ReceiptFormValues) => void;
  isSaving: boolean;
  phaseLabel?: string | null;
};

function parseAmount(value: string): number {
  const normalized = value.replace(/\s/g, '').replace(',', '.');
  return Number(normalized);
}

export function ConfirmReceiptModal({
  visible,
  processed,
  onClose,
  onConfirm,
  onFillManually,
  isSaving,
  phaseLabel,
}: ConfirmReceiptModalProps) {
  const insets = useSafeAreaInsets();
  const [values, setValues] = useState<ReceiptFormValues>(() => ocrToFormValues(null));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !processed) return;
    setValues(ocrToFormValues(processed.ocrResult));
    setErrors({});
    setApiError(null);
  }, [visible, processed]);

  if (!processed) return null;

  async function handleConfirm() {
    setApiError(null);
    const parsedAmount = parseAmount(values.amount);
    const confirmation = formValuesToConfirmation(values, parsedAmount);
    const result = receiptConfirmationSchema.safeParse(confirmation);

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const key = issue.path[0];
        if (typeof key === 'string') fieldErrors[key] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});

    try {
      await onConfirm(processed!, values);
    } catch (error) {
      setApiError(getApiErrorMessage(error, 'o movimento'));
    }
  }

  const hasOcr = processed.ocrResult !== null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Fechar" />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text variant="h2">Confirmar talão</Text>
            <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Fechar">
              <SymbolView
                name={{ ios: 'xmark.circle.fill', android: 'close', web: 'close' }}
                tintColor={colors.textMuted}
                size={28}
              />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.content}>
            <ReceiptPreview draft={processed.draft} />

            {hasOcr ? <OcrResultCard ocr={processed.ocrResult!} /> : (
              <Card variant="outlined" style={styles.noOcr}>
                <Text variant="caption" color="textMuted">
                  O OCR não devolveu dados. Preenche os campos manualmente abaixo.
                </Text>
              </Card>
            )}

            <ReceiptDataForm
              values={values}
              onChange={setValues}
              ocrSnapshot={processed.ocrResult}
              errors={errors}
            />

            {apiError ? (
              <Card variant="outlined" style={styles.errorCard}>
                <Text variant="caption" color="danger">
                  {apiError}
                </Text>
              </Card>
            ) : null}

            {phaseLabel ? (
              <Text variant="caption" color="textMuted" align="center">
                {phaseLabel}
              </Text>
            ) : null}

            <Button
              label={phaseLabel ?? 'Confirmar e guardar'}
              onPress={handleConfirm}
              loading={isSaving}
              fullWidth
              size="lg"
            />

            <Button
              label="Voltar e preencher manualmente"
              variant="ghost"
              onPress={() => onFillManually(processed, values)}
              disabled={isSaving}
              fullWidth
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.backgroundElevated,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: '94%',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.borderStrong,
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  noOcr: {
    borderColor: colors.border,
  },
  errorCard: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerMuted,
  },
});
