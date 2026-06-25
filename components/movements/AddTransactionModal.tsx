import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { DraggableBottomSheet, SegmentedControl } from '@/components/layout';
import { Button, Card, DatePickerField, Text, TextField } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useDiagnosticScreen } from '@/hooks/useDiagnosticScreen';
import { useProcessReceipt } from '@/hooks/useProcessReceipt';
import { useReceiptImage } from '@/hooks/useReceiptImage';
import { formHasAnyText } from '@/lib/forms';
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
import type { Transaction, TransactionFilter, TransactionType } from '@/lib/domain/transaction.types';
import {
  getApiErrorMessage,
  getReceiptUploadErrorMessage,
  ReceiptUploadError,
} from '@/lib/api/errors';
import { uploadReceiptOnly } from '@/lib/api/services/receipt.service';
import { resolveOcrUserMessage, DEFAULT_OCR_FAILED_MESSAGE } from '@/lib/receipt/ocr-messages';
import { colors, radius, spacing } from '@/lib/theme';
import { logDoctorValidationFailure, traceMovementError, traceMovementStep } from '@/lib/doctor';
import { setDiagnosticAction } from '@/lib/diagnostics';
import { useMovementRenderProbe } from '@/hooks/useMovementRenderProbe';
import { todayInputDate } from '@/lib/utils/format';

import { ConfirmReceiptModal } from './ConfirmReceiptModal';
import { ReceiptAttachmentField } from './ReceiptAttachmentField';
import { ReceiptDigitizePreview } from './ReceiptDigitizePreview';
import { ReceiptOcrProcessingOverlay } from './ReceiptOcrProcessingOverlay';

export type TransactionModalPreset = TransactionFilter;

type AddTransactionModalProps = {
  visible: boolean;
  onClose: () => void;
  startWithReceiptPicker?: boolean;
  /** Filtro activo em Movimentos — define tipo inicial e se mostra selector. */
  presetFilter?: TransactionModalPreset;
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
  presetFilter = 'all',
  onImportCsv,
}: AddTransactionModalProps) {
  useDiagnosticScreen(visible ? 'movement_create' : 'movement_create_closed');
  useMovementRenderProbe(visible);

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
  const [date, setDate] = useState(todayInputDate());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  const categories = getCategoriesForType(type);
  const isSaving = createMutation.isPending;
  const isProcessing = processReceipt.isPending;
  const savePhaseLabel = getCreateTransactionPhaseLabel(createMutation.phase);
  const processPhaseLabel = processReceipt.phaseLabel;

  const showTypePicker = presetFilter === 'all';
  const lockedType: TransactionType | null =
    presetFilter === 'expense' ? 'expense' : presetFilter === 'income' ? 'income' : null;

  useEffect(() => {
    if (!visible) return;

    traceMovementStep('form_init_start', { lockedType, presetFilter });

    const initialType = lockedType ?? 'expense';
    const defaultCategory = getCategoriesForType(initialType)[0]?.id ?? '';

    setType(initialType);
    setAmount('');
    setCategory(defaultCategory);
    setDescription('');
    setDate(todayInputDate());
    setErrors({});
    setApiError(null);
    setProcessedReceipt(null);
    setConfirmVisible(false);
    setManualFillMode(false);
    setIsUploadingOnly(false);
    setRetakePending(false);
    receiptImage.reset();
    if (!createMutation.isPending) {
      createMutation.reset();
    }
    processReceipt.reset();
    didAutoPick.current = false;

    traceMovementStep('form_init_done', { initialType, defaultCategory });
  }, [visible, lockedType]);

  useEffect(() => {
    if (!visible) return;
    traceMovementStep('effect_sync_category', { type });
    const cats = getCategoriesForType(type);
    setCategory((current) =>
      current && cats.some((item) => item.id === current) ? current : cats[0]?.id ?? '',
    );
  }, [type, visible]);

  useEffect(() => {
    if (!visible || !startWithReceiptPicker || didAutoPick.current) return;
    traceMovementStep('effect_auto_receipt_picker');
    didAutoPick.current = true;
    receiptImage.showSourcePicker();
  }, [visible, startWithReceiptPicker]);

  useEffect(() => {
    if (!visible) {
      traceMovementStep('form_close_request', { reason: 'visible_false' });
    }
  }, [visible]);

  const handleProcessReceipt = useCallback(async () => {
    if (!receiptImage.draft) return;

    setApiError(null);

    try {
      const processed = await processReceipt.mutateAsync(receiptImage.draft);
      const humanMessage = resolveOcrUserMessage(
        processed.ocrUnavailableReason ?? DEFAULT_OCR_FAILED_MESSAGE,
      );
      const withMessage = processed.ocrResult
        ? processed
        : {
            ...processed,
            ocrUnavailableReason: humanMessage,
          };
      setProcessedReceipt(withMessage);
      setConfirmVisible(true);
      if (!processed.ocrResult) {
        showToast(humanMessage, 'info');
      }
    } catch {
      try {
        const processed = await uploadReceiptOnly(receiptImage.draft);
        const humanMessage = DEFAULT_OCR_FAILED_MESSAGE;
        setProcessedReceipt({
          ...processed,
          ocrUnavailableReason: humanMessage,
        });
        setConfirmVisible(true);
        showToast(humanMessage, 'info');
      } catch (uploadError) {
        if (uploadError instanceof ReceiptUploadError) {
          setApiError(getReceiptUploadErrorMessage(uploadError));
        } else {
          setApiError('Não foi possível enviar o talão. Tenta novamente ou preenche sem anexo.');
        }
      }
    }
  }, [processReceipt, receiptImage.draft, showToast]);

  useEffect(() => {
    if (!retakePending || !receiptImage.draft) return;
    if (receiptImage.isPicking || receiptImage.isPreprocessing) return;

    traceMovementStep('effect_retake_receipt', {
      draftUri: receiptImage.draft.localUri?.slice(-24),
    });

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
    handleProcessReceipt,
  ]);

  function applyFormValues(values: ReceiptFormValues) {
    setType(values.type);
    setAmount(values.amount);
    setCategory(values.category);
    setDescription(values.description || values.merchantName);
    setDate(values.date);
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
    traceMovementStep('save_click', { path: 'manual' });
    setApiError(null);

    traceMovementStep('validation_start', { type, category, amountLen: amount.length });

    const parsedAmount = parseAmount(amount);
    const result = createTransactionSchema.safeParse({
      type,
      amount: parsedAmount,
      category,
      description: description.trim() || undefined,
      date,
    });

    if (!result.success) {
      traceMovementStep('validation_fail', {
        issues: result.error.issues.map((i) => i.message),
      });
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const key = issue.path[0];
        if (typeof key === 'string') fieldErrors[key] = issue.message;
      });
      setErrors(fieldErrors);
      logDoctorValidationFailure({
        action: 'create_transaction',
        screen: 'AddTransactionModal',
        reason: result.error.issues.map((issue) => issue.message).join('; '),
        payload: { type, category },
      });
      showToast('Verifica os campos assinalados.', 'error');
      return;
    }

    setErrors({});

    traceMovementStep('validation_success', { type: result.data.type, amount: result.data.amount });
    setDiagnosticAction('save_movement');

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

      traceMovementStep('mutation_start', { path: 'manual', isFirst });
      await createMutation.mutateAsync(input);
      traceMovementStep('mutation_success', { path: 'manual' });

      if (isFirst) {
        track(AnalyticsEvents.FIRST_TRANSACTION_CREATED, { type: result.data.type });
      }

      showToast('Movimento guardado.', 'success');
      traceMovementStep('modal_close', { path: 'manual', reason: 'save_ok' });
      onClose();
    } catch (error) {
      traceMovementError('mutation_error', error, { path: 'manual' });
      if (error instanceof ReceiptUploadError) {
        setApiError(getReceiptUploadErrorMessage(error));
      } else {
        setApiError(getApiErrorMessage(error, 'o movimento'));
      }
      showToast('Não conseguimos guardar este movimento. Tenta novamente.', 'error');
    }
  }

  async function handleConfirmReceipt(
    processed: ProcessedReceipt,
    values: ReceiptFormValues,
  ) {
    const confirmation = formValuesToConfirmation(values, parseAmount(values.amount));

    const existingTxs =
      queryClient.getQueryData<Transaction[]>(queryKeys.transactions({ filter: 'all' })) ?? [];
    const isFirst = existingTxs.length === 0;

    setDiagnosticAction('save_movement');

    try {
      traceMovementStep('mutation_start', { path: 'receipt_confirm', isFirst });
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

      traceMovementStep('mutation_success', { path: 'receipt_confirm' });

      const itemsCount = outcome.itemsSavedCount ?? 0;

      try {
        track(AnalyticsEvents.RECEIPT_SCANNED, {
          items_count: itemsCount,
          has_ocr_items: itemsCount > 0,
        });
        if (isFirst) {
          track(AnalyticsEvents.FIRST_TRANSACTION_CREATED, { type: confirmation.type });
        }
      } catch {
        // Analytics não deve bloquear o fluxo
      }

      setConfirmVisible(false);

      if (itemsCount > 0) {
        showToast(
          `Movimento criado — ${itemsCount} ${itemsCount === 1 ? 'item do talão guardado' : 'itens do talão guardados'}.`,
          'success',
        );
      } else {
        showToast('Movimento criado com talão anexado.', 'success');
      }

      traceMovementStep('modal_close', { path: 'receipt_confirm', reason: 'save_ok' });
      onClose();
    } catch (error) {
      traceMovementError('mutation_error', error, { path: 'receipt_confirm' });
      if (error instanceof ReceiptUploadError) {
        setApiError(getReceiptUploadErrorMessage(error));
      } else {
        setApiError(getApiErrorMessage(error, 'o movimento'));
      }
      showToast('Não conseguimos guardar este movimento. Tenta novamente.', 'error');
      throw error;
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

  const isDirty = useMemo(() => {
    if (!visible) return false;
    if (showConfirm || receiptImage.draft || processedReceipt || manualFillMode) return true;
    return formHasAnyText(amount, category, description);
  }, [
    visible,
    showConfirm,
    receiptImage.draft,
    processedReceipt,
    manualFillMode,
    amount,
    category,
    description,
  ]);

  const hasReceipt = Boolean(receiptImage.draft);
  const showTransactionForm = !hasReceipt || manualFillMode;
  const isBusy = isProcessing || isSaving || isUploadingOnly;

  const handleSheetClose = useCallback(() => {
    traceMovementStep('modal_close', { reason: 'sheet_onClose' });
    onClose();
  }, [onClose]);

  const handleBeforeClose = useCallback(() => {
    if (showConfirm) {
      setConfirmVisible(false);
      return true;
    }
    return false;
  }, [showConfirm]);

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
        visible={visible && !receiptImage.pendingDraft}
        onClose={handleSheetClose}
        traceId="movement_create_sheet"
        isDirty={isDirty}
        onBeforeClose={handleBeforeClose}
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
            {showTypePicker ? (
              <SegmentedControl
                segments={TYPE_SEGMENTS}
                value={type}
                onChange={(next) => {
                  traceMovementStep('field_change', { field: 'type', value: next });
                  setType(next);
                }}
              />
            ) : (
              <Card variant="outlined" padding="md" style={styles.lockedTypeCard}>
                <Text variant="caption" color="textMuted">
                  Tipo de movimento
                </Text>
                <Text variant="bodyMedium" color="primary">
                  {type === 'income' ? 'Receita' : 'Despesa'}
                </Text>
              </Card>
            )}

            <TextField
              label="Valor (€)"
              diagnosticField="amount"
              value={amount}
              onChangeText={(text) => {
                traceMovementStep('field_change', { field: 'amount', len: text.length });
                setAmount(text);
              }}
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
                      onPress={() => {
                        traceMovementStep('field_change', { field: 'category', value: item.id });
                        setCategory(item.id);
                      }}
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
              diagnosticField="description"
              value={description}
              onChangeText={(text) => {
                traceMovementStep('field_change', { field: 'description', len: text.length });
                setDescription(text);
              }}
              placeholder="Ex: Jantar com amigos"
              maxLength={200}
            />

            <DatePickerField
              label="Data"
              value={date}
              onChange={(next) => {
                traceMovementStep('field_change', { field: 'date', value: next });
                setDate(next);
              }}
              error={errors.date}
            />
          </>
        ) : (
          <Card variant="outlined" style={styles.hintCard}>
            <Text variant="bodyMedium">Ficheiro anexado</Text>
            <Text variant="caption" color="textSecondary">
              Analisa com OCR para extrair valor, data e loja automaticamente — ou preenche
              manualmente. O ficheiro fica sempre guardado no movimento.
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
            label={processPhaseLabel ?? 'Analisar com OCR'}
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
            label={isUploadingOnly ? 'A guardar ficheiro...' : 'Preencher manualmente'}
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
  lockedTypeCard: {
    borderColor: colors.border,
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
    gap: spacing.xs,
  },
  errorCard: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerMuted,
  },
});
