import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { DraggableBottomSheet } from '@/components/layout';
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
import { colors, spacing } from '@/lib/theme';

import { OcrDetectionSummary } from './OcrDetectionSummary';
import { OcrFailureCard } from './ocr/OcrFailureCard';
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

function ocrStatusLabel(
  ocr: ProcessedReceipt['ocrResult'],
  unavailableReason?: string,
  manualMode?: boolean,
): {
  title: string;
  subtitle: string;
  tone: 'success' | 'warning' | 'neutral';
} {
  if (manualMode) {
    return {
      title: 'Preenchimento manual',
      subtitle: 'Os dados do OCR foram ignorados. O talão original continua anexado.',
      tone: 'neutral',
    };
  }

  if (!ocr) {
    return {
      title: 'Sem leitura automática',
      subtitle:
        unavailableReason ??
        'Preenche os campos abaixo — o talão original fica guardado no movimento.',
      tone: 'neutral',
    };
  }

  const filled = countOcrFilledFields(ocr);
  const confidence = ocr.confidence ?? 0;
  const isDevice = ocr.source === 'device';
  const isApi = ocr.source === 'api';
  const isDemo = ocr.source === 'demo';

  if (isDemo) {
    return {
      title: 'Dados de demonstração (não reais)',
      subtitle: 'Ignora o OCR e preenche manualmente com os valores reais do talão.',
      tone: 'warning',
    };
  }

  if (filled >= 3 && confidence >= 0.65) {
    return {
      title: isApi
        ? 'Boa leitura — confirma antes de guardar'
        : isDevice
          ? 'Leitura no dispositivo — revê os campos'
          : 'Dados detectados com boa confiança',
      subtitle: 'Campos a verde/amarelo vieram do OCR. Edita o que estiver errado.',
      tone: 'success',
    };
  }

  if (filled >= 1) {
    return {
      title: 'Leitura parcial',
      subtitle: 'Alguns campos podem estar incorrectos. Completa o que falta.',
      tone: 'warning',
    };
  }

  return {
    title: 'Poucos dados detectados',
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
  const ocrFailed = !processed.ocrResult && !manualMode;
  const status = ocrStatusLabel(
    processed.ocrResult,
    processed.ocrUnavailableReason,
    manualMode,
  );
  const previewDraft = {
    ...processed.draft,
    localUri: getReceiptDisplayUri(processed.draft),
    fileName: processed.draft.fileName.replace(/-ocr\.jpg$/i, '-original.jpg'),
  };

  return (
    <DraggableBottomSheet
      visible={visible}
      onClose={onClose}
      maxHeight="94%"
      scrollContentStyle={styles.content}
      header={(requestClose) => (
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text variant="h2">Rever e editar</Text>
            <Text variant="caption" color="textMuted">
              Confirma os dados do talão — o original fica sempre anexado
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
      <StatusBanner title={status.title} subtitle={status.subtitle} tone={status.tone} />

      <ReceiptPreview draft={previewDraft} />

      {hasOcr ? <OcrDetectionSummary ocr={processed.ocrResult!} /> : null}

      {ocrFailed ? (
        <OcrFailureCard message={processed.ocrUnavailableReason} />
      ) : null}

      {manualMode ? (
        <Card variant="outlined" style={styles.manualCard}>
          <Text variant="caption" color="textSecondary">
            Modo manual activo. Preenche Loja, Total e Data — o talão original permanece
            anexado.
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

      <View style={styles.actions}>
        {phaseLabel ? (
          <Text variant="caption" color="textMuted" align="center">
            {phaseLabel}
          </Text>
        ) : null}

        <Button
          label={phaseLabel ?? 'Confirmar e guardar movimento'}
          onPress={handleConfirm}
          loading={isSaving}
          fullWidth
          size="lg"
        />

        {!manualMode ? (
          <Button
            label="Ignorar OCR e preencher manualmente"
            variant="secondary"
            onPress={handleIgnoreOcr}
            disabled={isSaving}
            fullWidth
            icon={
              <SymbolView
                name={{ ios: 'hand.raised.fill', android: 'back_hand', web: 'back_hand' }}
                tintColor={colors.text}
                size={18}
              />
            }
          />
        ) : null}

        <Button
          label="Voltar ao formulário principal"
          variant="ghost"
          onPress={() => onFillManually(processed, values)}
          disabled={isSaving}
          fullWidth
        />
      </View>
    </DraggableBottomSheet>
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
    <Card
      variant="outlined"
      style={[styles.statusCard, { borderColor: palette.border, backgroundColor: palette.bg }]}>
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
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
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
  manualCard: {
    borderColor: colors.border,
    backgroundColor: colors.surfaceHighlight,
  },
  errorCard: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerMuted,
  },
  actions: {
    gap: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
