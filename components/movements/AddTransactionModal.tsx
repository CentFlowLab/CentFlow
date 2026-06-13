import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
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

import { SegmentedControl } from '@/components/layout';
import { Button, Card, Text, TextField } from '@/components/ui';
import { useProcessReceipt } from '@/hooks/useProcessReceipt';
import { useReceiptImage } from '@/hooks/useReceiptImage';
import {
  getCreateTransactionPhaseLabel,
  useCreateTransaction,
} from '@/hooks/queries/useTransactions';
import { getCategoriesForType } from '@/lib/data/transaction-categories';
import { formValuesToConfirmation } from '@/lib/domain/receipt-confirmation';
import { createTransactionSchema } from '@/lib/domain/transaction.schema';
import type { ProcessedReceipt, ReceiptFormValues } from '@/lib/domain/receipt.types';
import type { TransactionType } from '@/lib/domain/transaction.types';
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

type AddTransactionModalProps = {
  visible: boolean;
  onClose: () => void;
  startWithReceiptPicker?: boolean;
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
}: AddTransactionModalProps) {
  const insets = useSafeAreaInsets();
  const createMutation = useCreateTransaction();
  const processReceipt = useProcessReceipt();
  const receiptImage = useReceiptImage();
  const didAutoPick = useRef(false);

  const [processedReceipt, setProcessedReceipt] = useState<ProcessedReceipt | null>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [manualFillMode, setManualFillMode] = useState(false);
  const [isUploadingOnly, setIsUploadingOnly] = useState(false);

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

  function applyFormValues(values: ReceiptFormValues) {
    setType(values.type);
    setAmount(values.amount);
    setCategory(values.category);
    setDescription(values.description);
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
      if (error instanceof ReceiptUploadError) {
        setApiError(
          `${getReceiptUploadErrorMessage(error)} Podes ignorar o OCR e preencher manualmente.`,
        );
      } else {
        setApiError(
          `${getApiErrorMessage(error, 'o talão')} Podes ignorar o OCR e preencher manualmente.`,
        );
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

      await createMutation.mutateAsync(input);
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

    await createMutation.mutateAsync({
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

    setConfirmVisible(false);
    onClose();
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

  const hasReceipt = Boolean(receiptImage.draft);
  const showTransactionForm = !hasReceipt || manualFillMode;
  const isBusy = isProcessing || isSaving || isUploadingOnly;

  return (
    <>
      <Modal
        visible={visible && !confirmVisible}
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
              <Text variant="h2">Novo movimento</Text>
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
              contentContainerStyle={styles.form}>
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
                  <SegmentedControl
                    segments={TYPE_SEGMENTS}
                    value={type}
                    onChange={setType}
                  />

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
                    Com talão anexado, analisa a imagem para extrair dados automaticamente
                    ou preenche manualmente no passo seguinte.
                  </Text>
                </Card>
              )}

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
                  label={
                    savePhaseLabel ??
                    (hasReceipt ? 'Guardar movimento' : 'Guardar movimento')
                  }
                  onPress={handleSaveManual}
                  loading={isSaving}
                  disabled={receiptImage.isPicking || isBusy}
                  fullWidth
                  size="lg"
                />
              ) : null}

              {hasReceipt && !manualFillMode ? (
                <Button
                  label={isUploadingOnly ? 'A guardar talão...' : 'Ignorar OCR e preencher manualmente'}
                  variant="secondary"
                  onPress={() => void handleManualWithoutOcr()}
                  loading={isUploadingOnly}
                  disabled={isBusy || receiptImage.isPicking}
                  fullWidth
                />
              ) : null}
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <ConfirmReceiptModal
        visible={confirmVisible}
        processed={processedReceipt}
        onClose={() => setConfirmVisible(false)}
        onConfirm={handleConfirmReceipt}
        onFillManually={handleFillManually}
        onIgnoreOcr={handleIgnoreOcr}
        isSaving={isSaving}
        phaseLabel={savePhaseLabel}
      />
    </>
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
    maxHeight: '92%',
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
  form: {
    gap: spacing.lg,
    paddingBottom: spacing.xl,
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
