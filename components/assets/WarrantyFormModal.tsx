import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';

import { DraggableBottomSheet } from '@/components/layout';
import { Button, Card, Text, TextField } from '@/components/ui';
import {
  useCreateWarranty,
  useDeleteWarranty,
  useUpdateWarranty,
} from '@/hooks/queries/useAssets';
import { useTransactions } from '@/hooks/queries/useTransactions';
import { AnalyticsEvents, track, useAnalytics } from '@/lib/analytics';
import { getApiErrorMessage } from '@/lib/api/errors';
import { createWarrantySchema } from '@/lib/domain/assets.schema';
import type { Warranty } from '@/lib/domain/assets.types';
import type { Transaction } from '@/lib/domain/transaction.types';
import { getWarrantyExpiryInfo } from '@/lib/domain/warranty.utils';
import { colors, spacing } from '@/lib/theme';
import { DATE_INPUT_PLACEHOLDER, formatInputDate, inputDateToIso, isValidInputDate } from '@/lib/utils/format';

import { WarrantyReceiptPicker } from './WarrantyReceiptPicker';

type WarrantyFormModalProps = {
  visible: boolean;
  onClose: () => void;
  warranty?: Warranty | null;
};

export function WarrantyFormModal({ visible, onClose, warranty = null }: WarrantyFormModalProps) {
  const isEditing = Boolean(warranty);
  const createWarranty = useCreateWarranty();
  const updateWarranty = useUpdateWarranty();
  const deleteWarranty = useDeleteWarranty();

  useAnalytics();
  const { data: transactions = [], isLoading: isLoadingTransactions } = useTransactions('all');

  const [product, setProduct] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [store, setStore] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<Transaction | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  const isSaving = createWarranty.isPending || updateWarranty.isPending;
  const isDeleting = deleteWarranty.isPending;

  useEffect(() => {
    if (!visible) return;

    if (warranty) {
      setProduct(warranty.product);
      setExpiresAt(formatInputDate(warranty.expiresAt));
      setPurchaseDate(formatInputDate(warranty.purchaseDate));
      setStore(warranty.store ?? '');
      setSelectedReceipt(null);
    } else {
      setProduct('');
      setExpiresAt(formatInputDate(new Date(Date.now() + 365 * 86400000)));
      setPurchaseDate('');
      setStore('');
      setSelectedReceipt(null);
    }

    setErrors({});
    setApiError(null);
    createWarranty.reset();
    updateWarranty.reset();
    deleteWarranty.reset();
  }, [visible, warranty?.id]);

  const receiptId = warranty?.receiptTransactionId;

  useEffect(() => {
    if (!visible || !receiptId || transactions.length === 0) return;
    setSelectedReceipt(transactions.find((tx) => tx.id === receiptId) ?? null);
  }, [visible, receiptId, transactions]);

  const expiryPreview = useMemo(() => {
    if (!expiresAt || !isValidInputDate(expiresAt)) return null;
    const iso = inputDateToIso(expiresAt);
    if (!iso) return null;
    return getWarrantyExpiryInfo(iso);
  }, [expiresAt]);

  function handleSelectReceipt(transaction: Transaction | null) {
    setSelectedReceipt(transaction);
    if (transaction && !product.trim()) {
      setProduct(transaction.description?.trim() || transaction.categoryLabel);
    }
    if (transaction?.description && !store.trim()) {
      const maybeStore = transaction.description.split('·')[0]?.trim();
      if (maybeStore) setStore(maybeStore);
    }
  }

  async function handleSave() {
    setApiError(null);
    setErrors({});

    const result = createWarrantySchema.safeParse({
      product,
      expiresAt,
      store: store || undefined,
      purchaseDate: purchaseDate || undefined,
      receiptTransactionId: selectedReceipt?.id,
      receiptId: selectedReceipt?.receiptId ?? undefined,
      receiptLabel: selectedReceipt
        ? selectedReceipt.description?.trim() || selectedReceipt.categoryLabel
        : undefined,
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

    try {
      if (isEditing && warranty) {
        await updateWarranty.mutateAsync({ id: warranty.id, input: result.data });
      } else {
        await createWarranty.mutateAsync(result.data);
        track(AnalyticsEvents.WARRANTY_CREATED);
      }
      onClose();
    } catch (error) {
      setApiError(getApiErrorMessage(error, 'a garantia'));
    }
  }

  function confirmDelete() {
    if (!warranty) return;
    const message = `Eliminar garantia de "${warranty.product}"?`;

    if (Platform.OS === 'web') {
      if (typeof globalThis.confirm === 'function' && globalThis.confirm(message)) {
        void executeDelete();
      }
      return;
    }

    Alert.alert('Eliminar garantia', message, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => void executeDelete() },
    ]);
  }

  async function executeDelete() {
    if (!warranty) return;
    try {
      await deleteWarranty.mutateAsync(warranty.id);
      onClose();
    } catch (error) {
      setApiError(getApiErrorMessage(error, 'a garantia'));
    }
  }

  return (
    <DraggableBottomSheet
      visible={visible}
      onClose={onClose}
      maxHeight="92%"
      scrollContentStyle={styles.content}
      header={(requestClose) => (
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text variant="h2">{isEditing ? 'Editar garantia' : 'Nova garantia'}</Text>
            <Text variant="caption" color="textMuted">
              Regista validade e associa ao talão de compra
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
      <TextField
        label="Produto"
        value={product}
        onChangeText={setProduct}
        placeholder='Ex: MacBook Pro 14"'
        error={errors.product}
      />

      <View style={styles.row}>
        <View style={styles.halfField}>
          <TextField
            label="Data de expiração"
            value={expiresAt}
            onChangeText={setExpiresAt}
            placeholder={DATE_INPUT_PLACEHOLDER}
            error={errors.expiresAt}
          />
        </View>
        <View style={styles.halfField}>
          <TextField
            label="Data de compra"
            value={purchaseDate}
            onChangeText={setPurchaseDate}
            placeholder={DATE_INPUT_PLACEHOLDER}
            error={errors.purchaseDate}
          />
        </View>
      </View>

      <TextField
        label="Loja (opcional)"
        value={store}
        onChangeText={setStore}
        placeholder="Ex: Worten"
      />

      {expiryPreview ? (
        <Card
          variant="outlined"
          padding="md"
          style={[
            styles.previewCard,
            expiryPreview.status === 'critical' || expiryPreview.status === 'expired'
              ? styles.previewDanger
              : null,
          ]}>
          <View style={styles.previewRow}>
            <SymbolView
              name={{
                ios:
                  expiryPreview.status === 'expired' || expiryPreview.status === 'critical'
                    ? 'exclamationmark.triangle.fill'
                    : 'shield.fill',
                android:
                  expiryPreview.status === 'expired' || expiryPreview.status === 'critical'
                    ? 'warning'
                    : 'verified_user',
                web:
                  expiryPreview.status === 'expired' || expiryPreview.status === 'critical'
                    ? 'warning'
                    : 'verified_user',
              }}
              tintColor={expiryPreview.color}
              size={18}
            />
            <Text variant="bodyMedium" style={{ color: expiryPreview.color }}>
              {expiryPreview.label}
            </Text>
          </View>
        </Card>
      ) : null}

      <Text variant="label" color="textMuted">
        Associar talão (opcional)
      </Text>
      <WarrantyReceiptPicker
        transactions={transactions}
        selectedId={selectedReceipt?.id}
        onSelect={handleSelectReceipt}
        isLoading={isLoadingTransactions}
      />

      {apiError ? (
        <Card variant="outlined" style={styles.errorCard}>
          <Text variant="caption" color="danger">
            {apiError}
          </Text>
        </Card>
      ) : null}

      <Button
        label={isSaving ? 'A guardar...' : isEditing ? 'Guardar alterações' : 'Guardar garantia'}
        onPress={handleSave}
        loading={isSaving}
        fullWidth
        size="lg"
      />

      {isEditing ? (
        <Button
          label="Eliminar garantia"
          variant="ghost"
          onPress={confirmDelete}
          loading={isDeleting}
          fullWidth
        />
      ) : null}
    </DraggableBottomSheet>
  );
}

/** @deprecated Use WarrantyFormModal */
export function AddWarrantyModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  return <WarrantyFormModal visible={visible} onClose={onClose} />;
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
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfField: {
    flex: 1,
  },
  previewCard: {
    backgroundColor: colors.backgroundElevated,
  },
  previewDanger: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerMuted,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  errorCard: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerMuted,
  },
});
