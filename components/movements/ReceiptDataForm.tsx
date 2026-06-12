import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { SegmentedControl } from '@/components/layout';
import { Text, TextField } from '@/components/ui';
import { getCategoriesForType } from '@/lib/data/transaction-categories';
import { isOcrFieldUnchanged } from '@/lib/domain/receipt-confirmation';
import type { ReceiptFormValues, ReceiptOcrResult } from '@/lib/domain/receipt.types';
import { colors, radius, spacing } from '@/lib/theme';

type ReceiptDataFormProps = {
  values: ReceiptFormValues;
  onChange: (values: ReceiptFormValues) => void;
  ocrSnapshot?: ReceiptOcrResult | null;
  errors?: Record<string, string>;
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
}: ReceiptDataFormProps) {
  const categories = getCategoriesForType(values.type);

  function update<K extends keyof ReceiptFormValues>(key: K, value: ReceiptFormValues[K]) {
    onChange({ ...values, [key]: value });
  }

  return (
    <View style={styles.container}>
      <Text variant="bodyMedium">Rever e editar</Text>
      <Text variant="caption" color="textMuted">
        Os campos com etiqueta OCR mantêm o valor detectado. Edita o que precisares.
      </Text>

      <SegmentedControl
        segments={TYPE_SEGMENTS}
        value={values.type}
        onChange={(type) => update('type', type)}
      />

      <LabeledField ocr={isOcrFieldUnchanged('merchantName', values, ocrSnapshot ?? null)}>
        <TextField
          label="Loja / Merchant"
          value={values.merchantName}
          onChangeText={(v) => update('merchantName', v)}
          placeholder="Ex: Continente"
          error={errors?.merchantName}
        />
      </LabeledField>

      <LabeledField ocr={isOcrFieldUnchanged('amount', values, ocrSnapshot ?? null)}>
        <TextField
          label="Valor total (€)"
          value={values.amount}
          onChangeText={(v) => update('amount', v)}
          keyboardType="decimal-pad"
          placeholder="0,00"
          error={errors?.amount}
        />
      </LabeledField>

      <View style={styles.field}>
        <View style={styles.labelRow}>
          <Text variant="caption" color="textSecondary" style={styles.fieldLabel}>
            Categoria
          </Text>
          {isOcrFieldUnchanged('category', values, ocrSnapshot ?? null) ? (
            <OcrBadge />
          ) : null}
        </View>
        <View style={styles.categoryGrid}>
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

      <LabeledField ocr={isOcrFieldUnchanged('description', values, ocrSnapshot ?? null)}>
        <TextField
          label="Descrição (opcional)"
          value={values.description}
          onChangeText={(v) => update('description', v)}
          placeholder="Notas sobre a compra"
          maxLength={200}
        />
      </LabeledField>

      <LabeledField ocr={isOcrFieldUnchanged('date', values, ocrSnapshot ?? null)}>
        <TextField
          label="Data"
          value={values.date}
          onChangeText={(v) => update('date', v)}
          placeholder="AAAA-MM-DD"
          error={errors?.date}
        />
      </LabeledField>
    </View>
  );
}

function LabeledField({
  children,
  ocr,
}: {
  children: React.ReactNode;
  ocr: boolean;
}) {
  return (
    <View style={styles.labeledField}>
      {ocr ? (
        <View style={styles.ocrRow}>
          <OcrBadge />
        </View>
      ) : null}
      {children}
    </View>
  );
}

function OcrBadge() {
  return (
    <View style={styles.ocrBadge}>
      <Text variant="caption" color="accent" style={styles.ocrBadgeText}>
        OCR
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  labeledField: {
    gap: spacing.xs,
  },
  ocrRow: {
    alignItems: 'flex-start',
  },
  ocrBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.accentMuted,
  },
  ocrBadgeText: {
    fontWeight: '600',
    fontSize: 10,
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
