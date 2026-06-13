import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button, Text } from '@/components/ui';
import { emptyReceiptFormItem } from '@/lib/domain/receipt-confirmation';
import type { ReceiptFormItem, ReceiptOcrResult } from '@/lib/domain/receipt.types';
import { getOcrFieldTone } from '@/lib/receipt/ocr-confidence';
import { colors, radius, spacing } from '@/lib/theme';
import { formatCurrency } from '@/lib/utils/format';

import { OcrFieldBadge } from './ocr/OcrFieldBadge';

type ReceiptItemsEditorProps = {
  items: ReceiptFormItem[];
  onChange: (items: ReceiptFormItem[]) => void;
  manualMode?: boolean;
  ocrSnapshot?: ReceiptOcrResult | null;
};

function parseItemAmount(value: string): number {
  const normalized = value.replace(/\s/g, '').replace(',', '.');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

export function ReceiptItemsEditor({
  items,
  onChange,
  manualMode = false,
  ocrSnapshot,
}: ReceiptItemsEditorProps) {
  const itemsSum = items.reduce((sum, item) => sum + parseItemAmount(item.amount), 0);
  const showOcr = Boolean(ocrSnapshot) && !manualMode;
  const itemsTone = showOcr && ocrSnapshot
    ? getOcrFieldTone(
        (ocrSnapshot.items?.length ?? 0) >= 2 ? 'medium' : 'low',
      )
    : null;

  function updateItem(id: string, patch: Partial<ReceiptFormItem>) {
    onChange(
      items.map((item) => {
        if (item.id !== id) return item;
        const next = { ...item, ...patch };
        if (patch.name !== undefined || patch.amount !== undefined) {
          next.fromOcr = false;
        }
        return next;
      }),
    );
  }

  function removeItem(id: string) {
    onChange(items.filter((item) => item.id !== id));
  }

  function addItem() {
    onChange([...items, emptyReceiptFormItem()]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <View style={styles.titleRow}>
            <Text variant="bodyMedium">Itens do talão</Text>
            {showOcr && items.length > 0 ? <OcrFieldBadge level="medium" compact /> : null}
          </View>
          <Text variant="caption" color="textMuted">
            {items.length > 0
              ? 'Edita nome e valor para conferir o total.'
              : 'Adiciona linhas se quiseres detalhar a compra.'}
          </Text>
        </View>
        {items.length > 0 ? (
          <View style={styles.countBadge}>
            <Text variant="caption" color="accent" style={styles.countText}>
              {items.length}
            </Text>
          </View>
        ) : null}
      </View>

      {items.length > 0 ? (
        <View
          style={[
            styles.list,
            itemsTone && {
              borderColor: itemsTone.border,
              backgroundColor: itemsTone.background,
            },
          ]}>
          <View style={styles.columnHeader}>
            <Text variant="caption" color="textMuted" style={styles.nameCol}>
              Artigo
            </Text>
            <Text variant="caption" color="textMuted" style={styles.amountCol}>
              Valor
            </Text>
            <View style={styles.actionCol} />
          </View>

          {items.map((item, index) => (
            <View key={item.id} style={styles.row}>
              <View style={[styles.nameCol, styles.inputWrap]}>
                <TextInput
                  value={item.name}
                  onChangeText={(name) => updateItem(item.id, { name })}
                  placeholder={`Item ${index + 1}`}
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.input,
                    !manualMode && item.fromOcr && styles.inputOcr,
                  ]}
                />
                {!manualMode && item.fromOcr ? (
                  <View style={styles.ocrDot} />
                ) : null}
              </View>

              <View style={[styles.amountCol, styles.inputWrap]}>
                <TextInput
                  value={item.amount}
                  onChangeText={(amount) => updateItem(item.id, { amount })}
                  placeholder="0,00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  style={[
                    styles.input,
                    styles.amountInput,
                    !manualMode && item.fromOcr && styles.inputOcr,
                  ]}
                />
              </View>

              <Pressable
                onPress={() => removeItem(item.id)}
                hitSlop={8}
                style={styles.removeBtn}
                accessibilityLabel={`Remover item ${index + 1}`}>
                <SymbolView
                  name={{ ios: 'minus.circle.fill', android: 'remove_circle', web: 'remove_circle' }}
                  tintColor={colors.textMuted}
                  size={22}
                />
              </Pressable>
            </View>
          ))}

          {itemsSum > 0 ? (
            <View style={styles.sumRow}>
              <Text variant="caption" color="textMuted">
                Soma dos itens
              </Text>
              <Text variant="bodyMedium" color="primary">
                {formatCurrency(itemsSum)}
              </Text>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.empty}>
          <Text variant="caption" color="textMuted" align="center">
            Nenhum item detectado. Podes adicionar manualmente ou guardar só com o total.
          </Text>
        </View>
      )}

      <Button
        label="Adicionar item"
        variant="secondary"
        size="sm"
        onPress={addItem}
        fullWidth
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  countBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontWeight: '700',
  },
  list: {
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  nameCol: {
    flex: 1,
  },
  amountCol: {
    width: 88,
  },
  actionCol: {
    width: 28,
  },
  inputWrap: {
    position: 'relative',
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.text,
    minHeight: 42,
  },
  inputOcr: {
    borderColor: colors.warning,
    backgroundColor: colors.accentMuted,
  },
  amountInput: {
    textAlign: 'right',
  },
  ocrDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.warning,
  },
  removeBtn: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  empty: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    backgroundColor: colors.surface,
  },
});
