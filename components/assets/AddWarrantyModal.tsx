import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { DraggableBottomSheet } from '@/components/layout';
import { Button, Card, Text, TextField } from '@/components/ui';
import { useCreateWarranty } from '@/hooks/queries/useAssets';
import { useTransactions } from '@/hooks/queries/useTransactions';
import { getApiErrorMessage } from '@/lib/api/errors';
import { createWarrantySchema } from '@/lib/domain/assets.schema';
import type { Transaction } from '@/lib/domain/transaction.types';
import { getWarrantyExpiryInfo } from '@/lib/domain/warranty.utils';
import { colors, radius, spacing } from '@/lib/theme';
import { toIsoDateString } from '@/lib/utils/format';

import { WarrantyReceiptPicker } from './WarrantyReceiptPicker';

type AddWarrantyModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function AddWarrantyModal({ visible, onClose }: AddWarrantyModalProps) {
  const createWarranty = useCreateWarranty();
  const { data: transactions = [], isLoading: isLoadingTransactions } = useTransactions('all');

  const [product, setProduct] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [store, setStore] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<Transaction | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setProduct('');
    setExpiresAt(toIsoDateString(new Date(Date.now() + 365 * 86400000)));
    setPurchaseDate('');
    setStore('');
    setSelectedReceipt(null);
    setErrors({});
    setApiError(null);
    createWarranty.reset();
  }, [visible, createWarranty]);

  const expiryPreview = useMemo(() => {
    if (!expiresAt || !/^\d{4}-\d{2}-\d{2}$/.test(expiresAt)) return null;
    return getWarrantyExpiryInfo(expiresAt);
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
      await createWarranty.mutateAsync(result.data);
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
            <Text variant="h2">Nova garantia</Text>
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
        placeholder="Ex: MacBook Pro 14&quot;"
        error={errors.product}
      />

      <View style={styles.row}>
        <View style={styles.halfField}>
          <TextField
            label="Data de expiração"
            value={expiresAt}
            onChangeText={setExpiresAt}
            placeholder="AAAA-MM-DD"
            error={errors.expiresAt}
          />
        </View>
        <View style={styles.halfField}>
          <TextField
            label="Data de compra"
            value={purchaseDate}
            onChangeText={setPurchaseDate}
            placeholder="AAAA-MM-DD"
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
        label={createWarranty.isPending ? 'A guardar...' : 'Guardar garantia'}
        onPress={handleSave}
        loading={createWarranty.isPending}
        fullWidth
        size="lg"
        icon={
          <SymbolView
            name={{ ios: 'shield.fill', android: 'verified_user', web: 'verified_user' }}
            tintColor={colors.textInverse}
            size={18}
          />
        }
      />
    </DraggableBottomSheet>
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
