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
  countOcrFilledFields,
  emptyReceiptFormValues,
  formValuesToConfirmation,
  ocrToFormValues,
} from '@/lib/domain/receipt-confirmation';
import { receiptConfirmationSchema } from '@/lib/domain/receipt-confirmation.schema';
import type { ProcessedReceipt, ReceiptFormValues } from '@/lib/domain/receipt.types';
import { getApiErrorMessage } from '@/lib/api/errors';
import { getReceiptDisplayUri } from '@/lib/receipt/receipt-image-preprocess';
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
  onIgnoreOcr: (processed: ProcessedReceipt) => void;
  isSaving: boolean;
  phaseLabel?: string | null;
};

function parseAmount(value: string): number {
  const normalized = value.replace(/\s/g, '').replace(',', '.');
  return Number(normalized);
}

function ocrStatusLabel(ocr: ProcessedReceipt['ocrResult']): {
  title: string;
  subtitle: string;
  tone: 'success' | 'warning' | 'neutral';
} {
  if (!ocr) {
    return {
      title: 'OCR sem resultados',
      subtitle: 'Preenche manualmente — o talão original fica guardado.',
      tone: 'neutral',
    };
  }

  const filled = countOcrFilledFields(ocr);
  const confidence = ocr.confidence ?? 0;

  if (filled >= 3 && confidence >= 0.65) {
    return {
      title: 'Dados detectados com boa confiança',
      subtitle: 'Revê os campos destacados antes de guardar.',
      tone: 'success',
    };
  }

  if (filled >= 1) {
    return {
      title: 'Leitura parcial — confirma os dados',
      subtitle: 'Alguns campos podem estar incorrectos. Edita o que precisares.',
      tone: 'warning',
    };
  }

  return {
    title: 'OCR com poucos dados',
    subtitle: 'Preenche manualmente ou ignora a leitura automática.',
    tone: 'neutral',
  };
}

export function ConfirmReceiptModal({
  visible,
  processed,
  onClose,
  onConfirm,
  onFillManually,
  onIgnoreOcr,
  isSaving,
  phaseLabel,
}: ConfirmReceiptModalProps) {
  const insets = useSafeAreaInsets();
  const [values, setValues] = useState<ReceiptFormValues>(() => emptyReceiptFormValues());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);

  useEffect(() => {
    if (!visible || !processed) return;
    setValues(ocrToFormValues(processed.ocrResult));
    setErrors({});
    setApiError(null);
    setManualMode(false);
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

  function handleIgnoreOcr() {
    setValues(emptyReceiptFormValues());
    setManualMode(true);
    setErrors({});
    onIgnoreOcr(processed!);
  }

  const hasOcr = processed.ocrResult !== null && !manualMode;
  const status = ocrStatusLabel(manualMode ? null : processed.ocrResult);
  const previewDraft = {
    ...processed.draft,
    localUri: getReceiptDisplayUri(processed.draft),
    fileName: processed.draft.fileName.replace(/-ocr\.jpg$/i, '-original.jpg'),
  };

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
            <Text variant="h2">Rever e editar</Text>
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
            <StatusBanner title={status.title} subtitle={status.subtitle} tone={status.tone} />

            <ReceiptPreview draft={previewDraft} />

            {hasOcr ? <OcrResultCard ocr={processed.ocrResult!} /> : null}

            {!hasOcr && !manualMode ? (
              <Card variant="outlined" style={styles.noOcr}>
                <Text variant="caption" color="textMuted">
                  O OCR não devolveu dados úteis. Preenche os campos abaixo — o talão
                  original permanece anexado ao movimento.
                </Text>
              </Card>
            ) : null}

            <ReceiptDataForm
              values={values}
              onChange={setValues}
              ocrSnapshot={manualMode ? null : processed.ocrResult}
              errors={errors}
              manualMode={manualMode}
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

            {hasOcr ? (
              <Button
                label="Ignorar OCR e preencher manualmente"
                variant="secondary"
                onPress={handleIgnoreOcr}
                disabled={isSaving}
                fullWidth
              />
            ) : null}

            <Button
              label="Voltar ao formulário principal"
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

function StatusBanner({
  title,
  subtitle,
  tone,
}: {
  title: string;
  subtitle: string;
  tone: 'success' | 'warning' | 'neutral';
}) {
  const palette = {
    success: { border: colors.success, bg: colors.successMuted, icon: colors.success },
    warning: { border: colors.warning, bg: colors.accentMuted, icon: colors.warning },
    neutral: { border: colors.border, bg: colors.surface, icon: colors.textMuted },
  }[tone];

  return (
    <Card variant="outlined" style={[styles.statusCard, { borderColor: palette.border, backgroundColor: palette.bg }]}>
      <View style={styles.statusRow}>
        <SymbolView
          name={{
            ios: tone === 'success' ? 'checkmark.seal.fill' : 'info.circle.fill',
            android: tone === 'success' ? 'verified' : 'info',
            web: tone === 'success' ? 'verified' : 'info',
          }}
          tintColor={palette.icon}
          size={20}
        />
        <View style={styles.statusText}>
          <Text variant="caption" style={styles.statusTitle}>
            {title}
          </Text>
          <Text variant="caption" color="textMuted">
            {subtitle}
          </Text>
        </View>
      </View>
    </Card>
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
  statusCard: {
    gap: spacing.xs,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  statusText: {
    flex: 1,
    gap: 2,
  },
  statusTitle: {
    fontWeight: '600',
  },
  noOcr: {
    borderColor: colors.border,
  },
  errorCard: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerMuted,
  },
});
