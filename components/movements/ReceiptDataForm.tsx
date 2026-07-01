import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { SegmentedControl } from '@/components/layout';
import { Card, DatePickerField, Text, TextField } from '@/components/ui';
import { getCategoriesForType } from '@/lib/data/transaction-categories';
import {
  isOcrFieldUnchanged,
  wasOcrFieldEdited,
} from '@/lib/domain/receipt-confirmation';
import type { ReceiptFormValues, ReceiptOcrResult } from '@/lib/domain/receipt.types';
import type { CashTransactionType } from '@/lib/domain/transaction.types';
import { getOcrFieldConfidence } from '@/lib/receipt/ocr-confidence';
import { colors, spacing } from '@/lib/theme';

import { CategoryField } from './CategoryField';
import { ReceiptItemsEditor } from './ReceiptItemsEditor';

type ReceiptDataFormProps = {
  values: ReceiptFormValues;
  onChange: (values: ReceiptFormValues) => void;
  ocrSnapshot?: ReceiptOcrResult | null;
  errors?: Record<string, string>;
  manualMode?: boolean;
  /** Esconde itens por defeito para manter o ecrã de confirmação calmo */
  collapseItems?: boolean;
};

const TYPE_SEGMENTS = [
  { key: 'expense' as const, label: 'Despesa' },
  { key: 'income' as const, label: 'Receita' },
];

type OcrFormField = 'merchantName' | 'amount' | 'date' | 'category' | 'description';

export function ReceiptDataForm({
  values,
  onChange,
  ocrSnapshot,
  errors,
  manualMode = false,
  collapseItems = false,
}: ReceiptDataFormProps) {
  const [itemsExpanded, setItemsExpanded] = useState(!collapseItems);
  const showOcr = Boolean(ocrSnapshot) && !manualMode;
  const itemCount = values.items.length;

  function update<K extends keyof ReceiptFormValues>(key: K, value: ReceiptFormValues[K]) {
    onChange({ ...values, [key]: value });
  }

  // T4d: ao alternar para Receita/Reembolso, sugere a categoria "Reembolso".
  function handleTypeChange(type: CashTransactionType) {
    if (type === values.type) return;
    const stillValid = getCategoriesForType(type).some((c) => c.id === values.category);
    onChange({
      ...values,
      type,
      category: stillValid ? values.category : type === 'income' ? 'refund' : '',
    });
  }

  function isOcr(key: OcrFormField): boolean {
    if (!showOcr) return false;
    return isOcrFieldUnchanged(key, values, ocrSnapshot ?? null);
  }

  function isEdited(key: OcrFormField): boolean {
    if (!showOcr) return false;
    return wasOcrFieldEdited(key, values, ocrSnapshot ?? null);
  }

  function ocrLevel(key: 'merchantName' | 'amount' | 'date' | 'category') {
    if (!showOcr || !ocrSnapshot) return undefined;
    return getOcrFieldConfidence(ocrSnapshot, key);
  }

  return (
    <View style={styles.container}>
      <View style={styles.fields}>
        <TextField
          label="Loja"
          value={values.merchantName}
          onChangeText={(v) => update('merchantName', v)}
          placeholder="Ex: Continente, Galp, Worten"
          error={errors?.merchantName}
          ocrHighlighted={isOcr('merchantName')}
          ocrEdited={isEdited('merchantName')}
          ocrConfidenceLevel={ocrLevel('merchantName')}
          autoCapitalize="words"
        />

        <View style={styles.amountDateRow}>
          <View style={styles.amountField}>
            <TextField
              label="Total (€)"
              value={values.amount}
              onChangeText={(v) => update('amount', v)}
              keyboardType="decimal-pad"
              placeholder="0,00"
              error={errors?.amount}
              ocrHighlighted={isOcr('amount')}
              ocrEdited={isEdited('amount')}
              ocrConfidenceLevel={ocrLevel('amount')}
            />
          </View>
          <View style={styles.dateField}>
            <DatePickerField
              label="Data"
              value={values.date}
              onChange={(v) => update('date', v)}
              error={errors?.date}
              ocrHighlighted={isOcr('date')}
              ocrEdited={isEdited('date')}
              ocrConfidenceLevel={ocrLevel('date')}
            />
          </View>
        </View>

        <SegmentedControl
          segments={TYPE_SEGMENTS}
          value={values.type}
          onChange={handleTypeChange}
        />

        <CategoryField
          type={values.type}
          value={values.category}
          onChange={(category) => update('category', category)}
          error={errors?.category}
        />

        <TextField
          label="Descrição (opcional)"
          value={values.description}
          onChangeText={(v) => update('description', v)}
          placeholder="Notas sobre a compra"
          maxLength={200}
          ocrHighlighted={isOcr('description')}
          ocrEdited={isEdited('description')}
        />
      </View>

      {itemCount > 0 || !collapseItems ? (
        <Card variant="outlined" style={styles.itemsCard}>
          {collapseItems ? (
            <Pressable
              onPress={() => setItemsExpanded((open) => !open)}
              style={styles.itemsToggle}
              accessibilityRole="button"
              accessibilityState={{ expanded: itemsExpanded }}>
              <View style={styles.itemsToggleText}>
                <Text variant="bodyMedium" style={styles.sectionTitle}>
                  Itens do talão
                </Text>
                <Text variant="caption" color="textMuted">
                  {itemCount > 0
                    ? `${itemCount} linha${itemCount === 1 ? '' : 's'} (opcional)`
                    : 'Sem itens detetados'}
                </Text>
              </View>
              <SymbolView
                name={{
                  ios: itemsExpanded ? 'chevron.up' : 'chevron.down',
                  android: itemsExpanded ? 'expand_less' : 'expand_more',
                  web: itemsExpanded ? 'expand_less' : 'expand_more',
                }}
                tintColor={colors.textMuted}
                size={18}
              />
            </Pressable>
          ) : (
            <Text variant="bodyMedium" style={styles.sectionTitle}>
              Itens do talão
            </Text>
          )}

          {itemsExpanded ? (
            <ReceiptItemsEditor
              items={values.items}
              onChange={(items) => update('items', items)}
              manualMode={manualMode}
              ocrSnapshot={showOcr ? ocrSnapshot : null}
            />
          ) : null}
        </Card>
      ) : null}

      {showOcr ? (
        <Text variant="caption" color="textMuted">
          Verde = OCR confiável · Amarelo = rever · Cinza «Editado» = alteraste o valor
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  fields: {
    gap: spacing.lg,
  },
  sectionTitle: {
    fontWeight: '600',
  },
  amountDateRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  amountField: {
    flex: 1,
  },
  dateField: {
    flex: 1,
  },
  itemsCard: {
    gap: spacing.md,
    backgroundColor: colors.backgroundElevated,
  },
  itemsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  itemsToggleText: {
    flex: 1,
    gap: 2,
  },
});
