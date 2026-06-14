import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import {
  Alert,
  BackHandler,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

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
import {
  getOcrConfidenceTone,
  getOcrSourceLabel,
} from '@/lib/receipt/ocr-confidence';
import { colors, radius, spacing } from '@/lib/theme';

import { OcrFailureCard } from './ocr/OcrFailureCard';
import { OcrFieldsChecklist } from './ocr/OcrFieldsChecklist';
import { ReceiptDataForm } from './ReceiptDataForm';
import { ReceiptImageViewer } from './ReceiptImageViewer';
import { ReceiptPreview } from './ReceiptPreview';

type ConfirmReceiptModalProps = {
  visible: boolean;
  processed: ProcessedReceipt | null;
  onClose: () => void;
  onConfirm: (processed: ProcessedReceipt, values: ReceiptFormValues) => Promise<void>;
  onFillManually: (processed: ProcessedReceipt, values: ReceiptFormValues) => void;
  onIgnoreOcr: (processed: ProcessedReceipt) => void;
  onRetakePhoto: () => void;
  onDiscard: () => void;
  isSaving: boolean;
  phaseLabel?: string | null;
  /** Quando true, renderiza só o conteúdo (sem Modal/Sheet próprio). */
  embedded?: boolean;
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
      subtitle: 'O talão original continua anexado ao movimento.',
      tone: 'neutral',
    };
  }

  if (!ocr) {
    return {
      title: 'Sem leitura automática',
      subtitle:
        unavailableReason ??
        'Preenche os campos — a foto do talão fica guardada no movimento.',
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
      title: 'Dados de demonstração',
      subtitle: 'Substitui pelos valores reais do teu talão.',
      tone: 'warning',
    };
  }

  if (filled >= 3 && confidence >= 0.65) {
    return {
      title: isApi
        ? 'Boa leitura — confirma os dados'
        : isDevice
          ? 'Leitura no dispositivo'
          : 'Dados detectados',
      subtitle: 'Revê rapidamente e corrige o que estiver errado.',
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
    subtitle: 'Preenche manualmente ou tira outra foto com melhor luz.',
    tone: 'neutral',
  };
}

function getPhotoQualityHint(
  ocr: ProcessedReceipt['ocrResult'],
  manualMode: boolean,
): string | null {
  if (manualMode || !ocr) return null;
  const confidence = ocr.confidence ?? 0;
  const filled = countOcrFilledFields(ocr);
  if (confidence < 0.45 || filled <= 1) {
    return 'Foto com pouca luz ou desfocada? Tira outra com o texto bem visível.';
  }
  return null;
}

export function ConfirmReceiptModal({
  visible,
  processed,
  onClose,
  onConfirm,
  onFillManually,
  onIgnoreOcr,
  onRetakePhoto,
  onDiscard,
  isSaving,
  phaseLabel,
  embedded = false,
}: ConfirmReceiptModalProps) {
  const { width } = useWindowDimensions();
  const isWide = width >= 680;

  const [values, setValues] = useState<ReceiptFormValues>(() => emptyReceiptFormValues());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [rawTextOpen, setRawTextOpen] = useState(false);

  useEffect(() => {
    if (!visible || !processed) return;
    setValues(ocrToFormValues(processed.ocrResult));
    setErrors({});
    setApiError(null);
    setManualMode(false);
    setViewerOpen(false);
    setRawTextOpen(false);
  }, [visible, processed]);

  useEffect(() => {
    if (!visible || !embedded) return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (viewerOpen) {
        setViewerOpen(false);
        return true;
      }
      return false;
    });

    return () => subscription.remove();
  }, [visible, embedded, viewerOpen]);

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

  function confirmDiscard() {
    Alert.alert(
      'Descartar talão?',
      'A foto e os dados lidos serão removidos. O movimento não será criado.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Descartar', style: 'destructive', onPress: onDiscard },
      ],
    );
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
  const qualityHint = getPhotoQualityHint(processed.ocrResult, manualMode);
  const ocrTone = processed.ocrResult
    ? getOcrConfidenceTone(processed.ocrResult.confidence, processed.ocrResult.source)
    : null;
  const showRawText =
    Boolean(processed.ocrResult?.rawText) &&
    !manualMode &&
    (ocrTone?.level === 'low' || ocrTone?.level === 'medium' || ocrFailed);

  const sheetHeader = (requestClose: () => void) => (
    <View style={styles.header}>
      <View style={styles.headerText}>
        <Text variant="h2">Confirmar talão</Text>
        <Text variant="caption" color="textMuted">
          Revê a foto e corrige os dados antes de guardar
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
  );

  const body = (
    <>
      <StatusBanner title={status.title} subtitle={status.subtitle} tone={status.tone} />

      <View style={[styles.main, isWide && styles.mainWide]}>
        <View style={[styles.previewColumn, isWide && styles.previewColumnWide]}>
          <ReceiptPreview
            draft={previewDraft}
            variant="hero"
            onPress={() => setViewerOpen(true)}
            qualityHint={qualityHint}
          />

          <View style={styles.previewActions}>
            <Button
              label="Tirar outra foto"
              variant="secondary"
              onPress={onRetakePhoto}
              disabled={isSaving}
              fullWidth
              icon={
                <SymbolView
                  name={{ ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' }}
                  tintColor={colors.text}
                  size={18}
                />
              }
            />
            <Button
              label="Descartar"
              variant="ghost"
              onPress={confirmDiscard}
              disabled={isSaving}
              fullWidth
            />
          </View>

          {hasOcr && processed.ocrResult ? (
            <OcrConfidenceStrip ocr={processed.ocrResult} />
          ) : null}
        </View>

        <View style={[styles.formColumn, isWide && styles.formColumnWide]}>
          {ocrFailed ? (
            <OcrFailureCard message={processed.ocrUnavailableReason} />
          ) : null}

          {manualMode ? (
            <Card variant="outlined" style={styles.manualCard}>
              <Text variant="caption" color="textSecondary">
                Modo manual — preenche Loja, Total e Data. O talão original permanece
                anexado.
              </Text>
            </Card>
          ) : null}

          {hasOcr && processed.ocrResult ? (
            <OcrFieldsChecklist ocr={processed.ocrResult} />
          ) : null}

          <ReceiptDataForm
            values={values}
            onChange={setValues}
            ocrSnapshot={manualMode ? null : processed.ocrResult}
            errors={errors}
            manualMode={manualMode}
            collapseItems
          />

          {showRawText ? (
            <Card variant="outlined" style={styles.rawTextCard}>
              <Pressable
                onPress={() => setRawTextOpen((open) => !open)}
                style={styles.rawTextToggle}>
                <Text variant="caption" color="textSecondary" style={styles.rawTextTitle}>
                  Texto lido pelo OCR
                </Text>
                <SymbolView
                  name={{
                    ios: rawTextOpen ? 'chevron.up' : 'chevron.down',
                    android: rawTextOpen ? 'expand_less' : 'expand_more',
                    web: rawTextOpen ? 'expand_less' : 'expand_more',
                  }}
                  tintColor={colors.textMuted}
                  size={16}
                />
              </Pressable>
              {rawTextOpen ? (
                <Text variant="caption" color="textMuted" style={styles.rawTextBody}>
                  {processed.ocrResult?.rawText}
                </Text>
              ) : null}
            </Card>
          ) : null}
        </View>
      </View>

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
          label={phaseLabel ?? 'Confirmar e guardar'}
          onPress={handleConfirm}
          loading={isSaving}
          variant="success"
          fullWidth
          size="lg"
          icon={
            <SymbolView
              name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
              tintColor={colors.textInverse}
              size={20}
            />
          }
        />

        {!manualMode ? (
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
      </View>
    </>
  );

  if (embedded) {
    if (!visible) return null;

    return (
      <>
        {body}
        <ReceiptImageViewer
          visible={viewerOpen}
          uri={getReceiptDisplayUri(processed.draft)}
          fileName={previewDraft.fileName}
          onClose={() => setViewerOpen(false)}
        />
      </>
    );
  }

  return (
    <>
      <DraggableBottomSheet
        visible={visible}
        onClose={onClose}
        maxHeight="94%"
        scrollContentStyle={styles.content}
        header={sheetHeader}>
        {body}
      </DraggableBottomSheet>

      <ReceiptImageViewer
        visible={viewerOpen}
        uri={getReceiptDisplayUri(processed.draft)}
        fileName={previewDraft.fileName}
        onClose={() => setViewerOpen(false)}
      />
    </>
  );
}

function OcrConfidenceStrip({ ocr }: { ocr: NonNullable<ProcessedReceipt['ocrResult']> }) {
  const tone = getOcrConfidenceTone(ocr.confidence, ocr.source);
  const filledFields = countOcrFilledFields(ocr);

  return (
    <Card
      variant="outlined"
      style={[styles.ocrStrip, { borderColor: tone.color, backgroundColor: tone.bg }]}>
      <View style={styles.ocrStripRow}>
        <SymbolView
          name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }}
          tintColor={tone.color}
          size={16}
        />
        <View style={styles.ocrStripText}>
          <Text variant="caption" style={{ color: tone.color, fontWeight: '700' }}>
            Confiança OCR: {tone.label}
          </Text>
          <Text variant="caption" color="textMuted">
            {getOcrSourceLabel(ocr.source)} · {filledFields} campos
          </Text>
        </View>
      </View>
    </Card>
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
  main: {
    gap: spacing.lg,
  },
  mainWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xl,
  },
  previewColumn: {
    gap: spacing.md,
  },
  previewColumnWide: {
    flex: 0.42,
    minWidth: 240,
  },
  formColumn: {
    gap: spacing.lg,
    flex: 1,
  },
  formColumnWide: {
    flex: 0.58,
  },
  previewActions: {
    gap: spacing.sm,
  },
  ocrStrip: {
    gap: spacing.xs,
  },
  ocrStripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  ocrStripText: {
    flex: 1,
    gap: 2,
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
  rawTextCard: {
    gap: spacing.sm,
    backgroundColor: colors.surface,
  },
  rawTextToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  rawTextTitle: {
    fontWeight: '600',
  },
  rawTextBody: {
    lineHeight: 18,
    fontFamily: 'monospace',
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
