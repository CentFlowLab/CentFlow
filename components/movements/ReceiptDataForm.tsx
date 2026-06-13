import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { SegmentedControl } from '@/components/layout';
import { Card, Text, TextField } from '@/components/ui';
import { getCategoriesForType } from '@/lib/data/transaction-categories';
import { isOcrFieldUnchanged } from '@/lib/domain/receipt-confirmation';
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
};

const TYPE_SEGMENTS = [
  { key: 'expense' as const, label: 'Despesa' },
  { key: 'income' as const, label: 'Receita' },
];

export function ReceiptDataForm({
  values,
  onChange,
  ocrSnapshot,
  errors,
  manualMode = false,
}: ReceiptDataFormProps) {
  const categories = getCategoriesForType(values.type);
  const showOcr = Boolean(ocrSnapshot) && !manualMode;

  function update<K extends keyof ReceiptFormValues>(key: K, value: ReceiptFormValues[K]) {
    onChange({ ...values, [key]: value });
  }

  function isOcr(key: keyof ReceiptFormValues): boolean {
    if (!showOcr) return false;
    return isOcrFieldUnchanged(key, values, ocrSnapshot ?? null);
  }

  function ocrLevel(key: 'merchantName' | 'amount' | 'date' | 'category') {
    if (!showOcr || !ocrSnapshot) return undefined;
    return getOcrFieldConfidence(ocrSnapshot, key);
  }

  const categoryOcr = isOcr('category');
  const categoryTone = categoryOcr && ocrSnapshot
    ? getOcrFieldTone(getOcrFieldConfidence(ocrSnapshot, 'category'))
    : null;

  return (
    <View style={styles.container}>
      <Card variant="outlined" style={styles.primarySection}>
        <View style={styles.sectionHeader}>
          <SymbolView
            name={{ ios: 'star.fill', android: 'star', web: 'star' }}
            tintColor={colors.primary}
            size={16}
          />
          <Text variant="bodyMedium" style={styles.sectionTitle}>
            Campos principais
          </Text>
          {showOcr ? (
            <Text variant="caption" color="textMuted">
              Edita o que o OCR errou
            </Text>
          ) : null}
        </View>

        <TextField
          label="Loja"
          value={values.merchantName}
          onChangeText={(v) => update('merchantName', v)}
          placeholder="Ex: Continente, Galp, Worten"
          error={errors?.merchantName}
          ocrHighlighted={isOcr('merchantName')}
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
              ocrConfidenceLevel={ocrLevel('amount')}
            />
          </View>
          <View style={styles.dateField}>
            <TextField
              label="Data"
              value={values.date}
              onChangeText={(v) => update('date', v)}
              placeholder="AAAA-MM-DD"
              error={errors?.date}
              ocrHighlighted={isOcr('date')}
              ocrConfidenceLevel={ocrLevel('date')}
            />
          </View>
        </View>

        <View style={styles.field}>
          <View style={styles.labelRow}>
            <Text variant="caption" color="textSecondary" style={styles.fieldLabel}>
              Categoria
            </Text>
            {categoryOcr ? (
              <OcrFieldBadge level={ocrLevel('category')} compact />
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
      </Card>

      <Card variant="outlined" style={styles.section}>
        <Text variant="bodyMedium" style={styles.sectionTitle}>
          Tipo e notas
        </Text>

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
        />
      </Card>

      <Card variant="outlined" style={styles.section}>
        <ReceiptItemsEditor
          items={values.items}
          onChange={(items) => update('items', items)}
          manualMode={manualMode}
          ocrSnapshot={showOcr ? ocrSnapshot : null}
        />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  primarySection: {
    gap: spacing.lg,
    backgroundColor: colors.backgroundElevated,
    borderColor: colors.primaryMuted,
  },
  section: {
    gap: spacing.lg,
    backgroundColor: colors.backgroundElevated,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  sectionTitle: {
    fontWeight: '600',
    flex: 1,
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
});
