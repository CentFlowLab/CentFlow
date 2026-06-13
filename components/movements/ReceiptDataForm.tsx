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
  /** Utilizador ignorou OCR — sem badges nem destaque */
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="bodyMedium">Rever e editar</Text>
        {showOcr ? (
          <View style={styles.legend}>
            <View style={styles.legendDot} />
            <Text variant="caption" color="textMuted">
              Campos com etiqueta OCR = valor detectado automaticamente
            </Text>
          </View>
        ) : (
          <Text variant="caption" color="textMuted">
            Preenche os campos principais. O talão original fica guardado no movimento.
          </Text>
        )}
      </View>

      <TextField
        label="Loja"
        value={values.merchantName}
        onChangeText={(v) => update('merchantName', v)}
        placeholder="Ex: Continente, Galp, Worten"
        error={errors?.merchantName}
        ocrHighlighted={isOcr('merchantName')}
        autoCapitalize="words"
      />

      <TextField
        label="Total (€)"
        value={values.amount}
        onChangeText={(v) => update('amount', v)}
        keyboardType="decimal-pad"
        placeholder="0,00"
        error={errors?.amount}
        ocrHighlighted={isOcr('amount')}
      />

      <TextField
        label="Data"
        value={values.date}
        onChangeText={(v) => update('date', v)}
        placeholder="AAAA-MM-DD"
        error={errors?.date}
        ocrHighlighted={isOcr('date')}
      />

      <View style={styles.field}>
        <View style={styles.labelRow}>
          <Text variant="caption" color="textSecondary" style={styles.fieldLabel}>
            Categoria
          </Text>
          {isOcr('category') ? <OcrBadge /> : null}
        </View>
        <View style={[styles.categoryGrid, isOcr('category') && styles.categoryGridOcr]}>
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
      />
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
  header: {
    gap: spacing.xs,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
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
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryGridOcr: {
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
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
