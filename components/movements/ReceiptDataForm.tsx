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
import {
  getOcrFieldConfidence,
  getOcrFieldTone,
} from '@/lib/receipt/ocr-confidence';
import { colors, radius, spacing } from '@/lib/theme';

import { OcrFieldBadge } from './ocr/OcrFieldBadge';
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
  const categories = getCategoriesForType(values.type);
  const showOcr = Boolean(ocrSnapshot) && !manualMode;
  const itemCount = values.items.length;

  function update<K extends keyof ReceiptFormValues>(key: K, value: ReceiptFormValues[K]) {
    onChange({ ...values, [key]: value });
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

  const categoryOcr = isOcr('category');
  const categoryEdited = isEdited('category');
  const categoryTone = categoryOcr && ocrSnapshot
    ? getOcrFieldTone(getOcrFieldConfidence(ocrSnapshot, 'category'))
    : null;

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

        <View style={styles.field}>
          <View style={styles.labelRow}>
            <Text variant="caption" color="textSecondary" style={styles.fieldLabel}>
              Categoria
            </Text>
            {categoryOcr ? <OcrFieldBadge level={ocrLevel('category')} compact /> : null}
            {categoryEdited ? (
              <View style={styles.editedChip}>
                <Text variant="caption" color="textMuted">
                  Editado
                </Text>
              </View>
            ) : null}
          </View>
          <View
            style={[
              styles.categoryGrid,
              categoryTone && {
                borderColor: categoryTone.border,
                backgroundColor: categoryTone.background,
              },
            ]}>
            {categories.map((item) => {
              const isSelected = values.category === item.id;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => update('category', item.id)}
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
          {errors?.category ? (
            <Text variant="caption" color="danger">
              {errors.category}
            </Text>
          ) : null}
        </View>

        <SegmentedControl
          segments={TYPE_SEGMENTS}
          value={values.type}
          onChange={(type) => update('type', type)}
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
  field: {
    gap: spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  fieldLabel: {
    fontWeight: '500',
  },
  editedChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceHighlight,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
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
