import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { DraggableBottomSheet, SegmentedControl } from '@/components/layout';
import { Button, Card, Text, TextField } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useProcessReceipt } from '@/hooks/useProcessReceipt';
import { useReceiptImage } from '@/hooks/useReceiptImage';
import {
  getCreateTransactionPhaseLabel,
  useCreateTransaction,
} from '@/hooks/queries/useTransactions';
import { AnalyticsEvents, track, useAnalytics } from '@/lib/analytics';
import { queryKeys } from '@/lib/api/keys';
import { getCategoriesForType } from '@/lib/data/transaction-categories';
import { formValuesToConfirmation } from '@/lib/domain/receipt-confirmation';
import { createTransactionSchema } from '@/lib/domain/transaction.schema';
import type { ProcessedReceipt, ReceiptFormValues } from '@/lib/domain/receipt.types';
import type { Transaction, TransactionType } from '@/lib/domain/transaction.types';
import {
  getApiErrorMessage,
  getReceiptUploadErrorMessage,
  ReceiptUploadError,
} from '@/lib/api/errors';
import { uploadReceiptOnly } from '@/lib/api/services/receipt.service';
import { colors, radius, spacing } from '@/lib/theme';
import { toIsoDateString } from '@/lib/utils/format';

import { ConfirmReceiptModal } from './ConfirmReceiptModal';
import { ReceiptAttachmentField } from './ReceiptAttachmentField';
import { ReceiptDigitizePreview } from './ReceiptDigitizePreview';
import { ReceiptOcrProcessingOverlay } from './ReceiptOcrProcessingOverlay';

type AddTransactionModalProps = {
  visible: boolean;
  onClose: () => void;
  startWithReceiptPicker?: boolean;
  onImportCsv?: () => void;
};

const TYPE_SEGMENTS = [
  { key: 'expense' as const, label: 'Despesa' },
  { key: 'income' as const, label: 'Receita' },
];

function parseAmount(value: string): number {
  const normalized = value.replace(/\s/g, '').replace(',', '.');
  return Number(normalized);
}

export function AddTransactionModal({
  visible,
  onClose,
  startWithReceiptPicker = false,
  onImportCsv,
}: AddTransactionModalProps) {
  const createMutation = useCreateTransaction();
  const processReceipt = useProcessReceipt();
  const receiptImage = useReceiptImage();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  // Ensures identify is current right before the user can create transactions / scan receipts
  useAnalytics();

  const didAutoPick = useRef(false);
  const retakeBaselineUri = useRef<string | null>(null);

  const [processedReceipt, setProcessedReceipt] = useState<ProcessedReceipt | null>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [manualFillMode, setManualFillMode] = useState(false);
  const [isUploadingOnly, setIsUploadingOnly] = useState(false);
  const [retakePending, setRetakePending] = useState(false);

  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(toIsoDateString());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  const categories = getCategoriesForType(type);
  const isSaving = createMutation.isPending;
  const isProcessing = processReceipt.isPending;
  const savePhaseLabel = getCreateTransactionPhaseLabel(createMutation.phase);
  const processPhaseLabel = processReceipt.phaseLabel;

  useEffect(() => {
    if (!visible) return;

    setType('expense');
    setAmount('');
    setCategory('');
    setDescription('');
    setDate(toIsoDateString());
    setErrors({});
    setApiError(null);
    setProcessedReceipt(null);
    setConfirmVisible(false);
    setManualFillMode(false);
    setIsUploadingOnly(false);
    setRetakePending(false);
    receiptImage.reset();
    createMutation.reset();
    processReceipt.reset();
    didAutoPick.current = false;
  }, [visible]);

  useEffect(() => {
    setCategory('');
  }, [type]);

  useEffect(() => {
    if (!visible || !startWithReceiptPicker || didAutoPick.current) return;
    didAutoPick.current = true;
    receiptImage.showSourcePicker();
  }, [visible, startWithReceiptPicker]);

  useEffect(() => {
    if (!retakePending || !receiptImage.draft) return;
    if (receiptImage.isPicking || receiptImage.isPreprocessing) return;

    if (retakeBaselineUri.current === receiptImage.draft.localUri) {
      setRetakePending(false);
      retakeBaselineUri.current = null;
      return;
    }

    setRetakePending(false);
    retakeBaselineUri.current = null;
    void handleProcessReceipt();
  }, [
    retakePending,
    receiptImage.draft,
    receiptImage.isPicking,
    receiptImage.isPreprocessing,
  ]);

  function applyFormValues(values: ReceiptFormValues) {
    setType(values.type);
    setAmount(values.amount);
    setCategory(values.category);
    setDescription(values.description || values.merchantName);
    setDate(values.date);
  }

  async function handleProcessReceipt() {
    if (!receiptImage.draft) return;

    setApiError(null);

    try {
      const processed = await processReceipt.mutateAsync(receiptImage.draft);
      setProcessedReceipt(processed);
      setConfirmVisible(true);
    } catch (error) {
      try {
        const processed = await uploadReceiptOnly(receiptImage.draft);
        setProcessedReceipt({
          ...processed,
          ocrUnavailableReason:
            error instanceof ReceiptUploadError
              ? `${getReceiptUploadErrorMessage(error)} Preenche manualmente.`
              : `${getApiErrorMessage(error, 'o OCR')}. Preenche manualmente.`,
        });
        setConfirmVisible(true);
      } catch (uploadError) {
        if (uploadError instanceof ReceiptUploadError) {
          setApiError(getReceiptUploadErrorMessage(uploadError));
        } else {
          setApiError(getApiErrorMessage(uploadError, 'o talão'));
        }
      }
    }
  }

  async function handleManualWithoutOcr() {
    if (!receiptImage.draft) {
      setManualFillMode(true);
      return;
    }

    setApiError(null);
    setIsUploadingOnly(true);

    try {
      const processed = await uploadReceiptOnly(receiptImage.draft);
      setProcessedReceipt(processed);
      setManualFillMode(true);
    } catch (error) {
      if (error instanceof ReceiptUploadError) {
        setApiError(getReceiptUploadErrorMessage(error));
      } else {
        setApiError(getApiErrorMessage(error, 'o talão'));
      }
      setManualFillMode(true);
    } finally {
      setIsUploadingOnly(false);
    }
  }

  async function handleSaveManual() {
    setApiError(null);

    const parsedAmount = parseAmount(amount);
    const result = createTransactionSchema.safeParse({
      type,
      amount: parsedAmount,
      category,
      description: description.trim() || undefined,
      date,
    });

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
      const input = {
        ...result.data,
        ...(processedReceipt
          ? {
              receiptMeta: {
                receiptId: processedReceipt.receiptId,
                receiptUrl: processedReceipt.receiptUrl,
                receiptImage: processedReceipt.receiptImage,
              },
            }
          : {
              receipt: receiptImage.draft ?? undefined,
              skipOcr: true,
            }),
      };

      // Detect first transaction for analytics (best effort, before mutation invalidates cache)
      const existingTxs =
        queryClient.getQueryData<Transaction[]>(queryKeys.transactions({ filter: 'all' })) ?? [];
      const isFirst = existingTxs.length === 0;

      await createMutation.mutateAsync(input);

      if (isFirst) {
        track(AnalyticsEvents.FIRST_TRANSACTION_CREATED, { type: result.data.type });
      }

      onClose();
    } catch (error) {
      if (error instanceof ReceiptUploadError) {
        setApiError(getReceiptUploadErrorMessage(error));
      } else {
        setApiError(getApiErrorMessage(error, 'o movimento'));
      }
    }
  }

  async function handleConfirmReceipt(
    processed: ProcessedReceipt,
    values: ReceiptFormValues,
  ) {
    const confirmation = formValuesToConfirmation(values, parseAmount(values.amount));

    // Detect first transaction before the mutation mutates caches
    const existingTxs =
      queryClient.getQueryData<Transaction[]>(queryKeys.transactions({ filter: 'all' })) ?? [];
    const isFirst = existingTxs.length === 0;

    const outcome = await createMutation.mutateAsync({
      type: confirmation.type,
      amount: confirmation.amount,
      category: confirmation.category,
      description: confirmation.description,
      date: confirmation.date,
      receiptMeta: {
        receiptId: processed.receiptId,
        receiptUrl: processed.receiptUrl,
        receiptImage: processed.receiptImage,
      },
      confirmation,
    });

    // Analytics for receipt scan success (this is the "successful scan" moment)
    const itemsCount = outcome.itemsSavedCount ?? 0;
    track(AnalyticsEvents.RECEIPT_SCANNED, {
      items_count: itemsCount,
      has_ocr_items: itemsCount > 0,
    });

    if (isFirst) {
      track(AnalyticsEvents.FIRST_TRANSACTION_CREATED, { type: confirmation.type });
    }

    setConfirmVisible(false);
    onClose();

    if (itemsCount > 0) {
      showToast(
        `Movimento criado — ${itemsCount} ${itemsCount === 1 ? 'item do talão guardado' : 'itens do talão guardados'}.`,
        'success',
      );
    } else {
      showToast('Movimento criado com talão anexado.', 'success');
    }
  }

  function handleRetakePhoto() {
    retakeBaselineUri.current = receiptImage.draft?.localUri ?? null;
    setConfirmVisible(false);
    setRetakePending(true);
    void receiptImage.showSourcePicker();
  }

  function handleDiscardReceipt() {
    setConfirmVisible(false);
    setProcessedReceipt(null);
    setManualFillMode(false);
    receiptImage.reset();
    showToast('Talão descartado.', 'info');
  }

  function handleFillManually(processed: ProcessedReceipt, values: ReceiptFormValues) {
    setProcessedReceipt(processed);
    applyFormValues(values);
    setManualFillMode(true);
    setConfirmVisible(false);
  }

  function handleIgnoreOcr(processed: ProcessedReceipt) {
    setProcessedReceipt(processed);
  }

  const showConfirm = confirmVisible && processedReceipt !== null;

  const hasReceipt = Boolean(receiptImage.draft);
  const showTransactionForm = !hasReceipt || manualFillMode;
  const isBusy = isProcessing || isSaving || isUploadingOnly;

  return (
    <>
      {receiptImage.pendingDraft ? (
        <ReceiptDigitizePreview
          visible
          draft={receiptImage.pendingDraft}
          selection={receiptImage.digitizeSelection}
          onSelectionChange={receiptImage.setDigitizeSelection}
          onConfirm={receiptImage.confirmPendingDraft}
          onRetake={() => {
            receiptImage.discardPendingDraft();
            void receiptImage.showSourcePicker();
          }}
          onCancel={receiptImage.discardPendingDraft}
        />
      ) : null}

      <DraggableBottomSheet
        visible={visible}
        onClose={onClose}
        onBeforeClose={() => {
          if (showConfirm) {
            setConfirmVisible(false);
            return true;
          }
          return false;
        }}
        maxHeight="92%"
        scrollContentStyle={styles.form}
        header={(requestClose) =>
          showConfirm ? (
            <View style={styles.header}>
              <View style={styles.confirmHeaderText}>
                <Text variant="h2">Confirmar talão</Text>
                <Text variant="caption" color="textMuted">
                  Revê a foto e corrige os dados antes de guardar
                </Text>
              </View>
              <Pressable
                onPress={() => setConfirmVisible(false)}
                hitSlop={12}
                accessibilityLabel="Voltar">
                <SymbolView
                  name={{ ios: 'xmark.circle.fill', android: 'close', web: 'close' }}
                  tintColor={colors.textMuted}
                  size={28}
                />
              </Pressable>
            </View>
          ) : (
            <View style={styles.header}>
              <Text variant="h2">Novo movimento</Text>
              <Pressable onPress={requestClose} hitSlop={12} accessibilityLabel="Fechar">
                <SymbolView
                  name={{ ios: 'xmark.circle.fill', android: 'close', web: 'close' }}
                  tintColor={colors.textMuted}
                  size={28}
                />
              </Pressable>
            </View>
          )
        }>
        {showConfirm ? (
          <ConfirmReceiptModal
            embedded
            visible
            processed={processedReceipt}
            onClose={() => setConfirmVisible(false)}
            onConfirm={handleConfirmReceipt}
            onFillManually={handleFillManually}
            onIgnoreOcr={handleIgnoreOcr}
            onRetakePhoto={handleRetakePhoto}
            onDiscard={handleDiscardReceipt}
            isSaving={isSaving}
            phaseLabel={savePhaseLabel}
          />
        ) : (
          <>
        <ReceiptAttachmentField
          draft={receiptImage.draft}
          isPicking={receiptImage.isPicking}
          isPreprocessing={receiptImage.isPreprocessing}
          pickError={receiptImage.pickError}
          onPick={receiptImage.showSourcePicker}
          onRemove={receiptImage.remove}
        />

        {showTransactionForm ? (
          <>
            <SegmentedControl segments={TYPE_SEGMENTS} value={type} onChange={setType} />

            <TextField
              label="Valor (€)"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0,00"
              error={errors.amount}
            />

            <View style={styles.field}>
              <Text variant="caption" color="textSecondary" style={styles.fieldLabel}>
                Categoria
              </Text>
              <View style={styles.categoryGrid}>
                {categories.map((item) => {
                  const isSelected = category === item.id;
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => setCategory(item.id)}
                      style={[styles.categoryChip, isSelected && styles.categoryChipActive]}>
                      <SymbolView
                        name={item.icon}
                        tintColor={isSelected ? colors.primary : colors.textMuted}
                        size={16}
                      />
                      <Text
                        variant="caption"
                        color={isSelected ? 'text' : 'textMuted'}
                        style={isSelected ? styles.categoryLabelActive : undefined}>
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {errors.category ? (
                <Text variant="caption" color="danger" style={styles.fieldError}>
                  {errors.category}
                </Text>
              ) : null}
            </View>

            <TextField
              label="Descrição (opcional)"
              value={description}
              onChangeText={setDescription}
              placeholder="Ex: Jantar com amigos"
              maxLength={200}
            />

            <TextField
              label="Data"
              value={date}
              onChangeText={setDate}
              placeholder="AAAA-MM-DD"
              error={errors.date}
            />
          </>
        ) : (
          <Card variant="outlined" style={styles.hintCard}>
            <Text variant="caption" color="textSecondary">
              Com talão anexado, analisa a imagem para extrair dados automaticamente ou
              preenche manualmente no passo seguinte.
            </Text>
          </Card>
        )}

        {hasReceipt && !manualFillMode && isProcessing && processPhaseLabel ? (
          <ReceiptOcrProcessingOverlay phaseLabel={processPhaseLabel} />
        ) : null}

        {apiError ? (
          <Card variant="outlined" style={styles.errorCard}>
            <Text variant="caption" color="danger">
              {apiError}
            </Text>
          </Card>
        ) : null}

        {(isProcessing && processPhaseLabel) || (isSaving && savePhaseLabel) ? (
          <Text variant="caption" color="textMuted" align="center">
            {processPhaseLabel ?? savePhaseLabel}
          </Text>
        ) : null}

        {hasReceipt && !manualFillMode ? (
          <Button
            label={processPhaseLabel ?? 'Analisar talão'}
            onPress={handleProcessReceipt}
            loading={isProcessing}
            disabled={receiptImage.isPicking || isBusy}
            fullWidth
            size="lg"
          />
        ) : null}

        {showTransactionForm ? (
          <Button
            label={savePhaseLabel ?? 'Guardar movimento'}
            onPress={handleSaveManual}
            loading={isSaving}
            disabled={receiptImage.isPicking || isBusy}
            fullWidth
            size="lg"
          />
        ) : null}

        {hasReceipt && !manualFillMode ? (
          <Button
            label={
              isUploadingOnly ? 'A guardar talão...' : 'Ignorar OCR e preencher manualmente'
            }
            variant="secondary"
            onPress={() => void handleManualWithoutOcr()}
            loading={isUploadingOnly}
            disabled={isBusy || receiptImage.isPicking}
            fullWidth
          />
        ) : null}

        {onImportCsv ? (
          <Button
            label="Importar CSV"
            variant="secondary"
            onPress={onImportCsv}
            disabled={isBusy}
            fullWidth
            icon={
              <SymbolView
                name={{
                  ios: 'square.and.arrow.down',
                  android: 'upload_file',
                  web: 'upload_file',
                }}
                tintColor={colors.primary}
                size={18}
              />
            }
          />
        ) : null}
          </>
        )}
      </DraggableBottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  confirmHeaderText: {
    flex: 1,
    gap: spacing.xs,
    paddingRight: spacing.md,
  },
  form: {
    gap: spacing.lg,
  },
  field: {
    gap: spacing.xs,
  },
  fieldLabel: {
    fontWeight: '500',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  categoryLabelActive: {
    fontWeight: '600',
  },
  fieldError: {
    marginTop: spacing.xs,
  },
  hintCard: {
    borderColor: colors.border,
  },
  errorCard: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerMuted,
  },
});
