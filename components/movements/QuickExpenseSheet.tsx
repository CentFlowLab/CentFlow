import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { DraggableBottomSheet } from '@/components/layout';
import { Button, Text } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useCreateTransaction } from '@/hooks/queries/useTransactions';
import { useMonthlySpendable } from '@/hooks/useMonthlySpendable';
import { useAuth } from '@/lib/auth';
import { EXPENSE_CATEGORIES } from '@/lib/data/transaction-categories';
import { traceQuickExpense } from '@/lib/doctor/quick-expense-trace';
import {
  loadLastQuickExpense,
  saveLastQuickExpense,
  type LastQuickExpense,
} from '@/lib/storage/quick-expense-storage';
import { colors, radius, spacing } from '@/lib/theme';
import { formatCurrency, todayInputDate } from '@/lib/utils/format';

type QuickExpenseSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** Chamado após guardar com sucesso (ex.: navegar de volta no deep link). */
  onSaved?: () => void;
};

/** No máximo 8 categorias visíveis, conforme especificação. */
const QUICK_CATEGORIES = EXPENSE_CATEGORIES.slice(0, 8);
const AMOUNT_PRESETS = [1, 2, 5, 10, 20];

function parseAmount(raw: string): number {
  const normalized = raw.replace(',', '.').replace(/[^0-9.]/g, '');
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : 0;
}

function formatPresetAmount(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace('.', ',');
}

export function QuickExpenseSheet({ visible, onClose, onSaved }: QuickExpenseSheetProps) {
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [merchant, setMerchant] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastExpense, setLastExpense] = useState<LastQuickExpense | null>(null);

  const amountRef = useRef<TextInput>(null);
  const createMutation = useCreateTransaction();
  const { showToast } = useToast();
  const spendable = useMonthlySpendable();
  const { user } = useAuth();

  const pulse = useSharedValue(1);
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: 0.6 + (pulse.value - 1) * 2.5,
  }));

  useEffect(() => {
    if (!visible) {
      setAmount('');
      setCategoryId(null);
      setMerchant('');
      setNote('');
      setError(null);
      setLastExpense(null);
      return;
    }

    traceQuickExpense('open');
    const timer = setTimeout(() => amountRef.current?.focus(), 320);

    if (user?.id) {
      void loadLastQuickExpense(user.id).then(setLastExpense);
    }

    return () => clearTimeout(timer);
  }, [visible, user?.id]);

  const parsed = parseAmount(amount);
  const isValid = parsed > 0 && categoryId !== null;
  const isDirty =
    amount.length > 0 || categoryId !== null || merchant.length > 0 || note.length > 0;

  function handleSelectCategory(id: string) {
    setCategoryId(id);
    setError(null);
    traceQuickExpense('category_selected', { category: id });
  }

  function handlePresetAmount(value: number) {
    setAmount(formatPresetAmount(value));
    setError(null);
    traceQuickExpense('amount_preset', { value });
  }

  function handleRepeatLast() {
    if (!lastExpense) return;
    setAmount(formatPresetAmount(lastExpense.amount));
    setCategoryId(lastExpense.categoryId);
    setMerchant(lastExpense.merchant ?? '');
    setNote(lastExpense.note ?? '');
    setError(null);
    traceQuickExpense('repeat_last', { value: lastExpense.amount, category: lastExpense.categoryId });
  }

  function animateSpendable() {
    pulse.value = withSequence(
      withTiming(1.08, { duration: 180 }),
      withTiming(1, { duration: 260 }),
    );
  }

  async function handleSave() {
    if (parsed <= 0) {
      setError('Insere um valor maior que zero.');
      amountRef.current?.focus();
      return;
    }
    if (!categoryId) {
      setError('Escolhe uma categoria.');
      return;
    }

    traceQuickExpense('save_start', { value: parsed, category: categoryId });

    try {
      await createMutation.mutateAsync({
        type: 'expense',
        amount: parsed,
        category: categoryId,
        merchant: merchant.trim() || undefined,
        description: note.trim() || undefined,
        date: todayInputDate(),
      });
      traceQuickExpense('save_success', { value: parsed, category: categoryId });

      if (user?.id) {
        void saveLastQuickExpense(user.id, {
          amount: parsed,
          categoryId,
          merchant: merchant.trim() || undefined,
          note: note.trim() || undefined,
        });
      }

      animateSpendable();
      showToast('Despesa registada.', 'success');
      setTimeout(() => {
        onClose();
        onSaved?.();
      }, 720);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      traceQuickExpense('save_error', { error: message });
      setError('Não foi possível guardar. Tenta novamente.');
      showToast('Não foi possível guardar a despesa.', 'error');
    }
  }

  return (
    <DraggableBottomSheet
      visible={visible}
      onClose={onClose}
      isDirty={isDirty}
      maxHeight="90%"
      traceId="quick_expense"
      scrollContentStyle={styles.content}
      header={(requestClose) => (
        <View style={styles.header}>
          <View style={styles.headerTitle}>
            <Text variant="h2">Gasto rápido</Text>
            <Text variant="caption" color="textMuted">
              Regista uma despesa em segundos
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
      <Animated.View style={[styles.spendableChip, pulseStyle]}>
        <Text variant="caption" color="primary">
          Disponível este mês
        </Text>
        <Text variant="bodyMedium" color="text">
          {formatCurrency(spendable.remainingThisMonth)}
        </Text>
      </Animated.View>

      <View style={styles.amountBlock}>
        <Text variant="label" color="textMuted">
          Valor
        </Text>
        <View style={styles.amountRow}>
          <Text style={styles.currencySymbol}>€</Text>
          <TextInput
            ref={amountRef}
            value={amount}
            onChangeText={(text) => {
              setAmount(text);
              setError(null);
            }}
            onEndEditing={() => {
              if (parsed > 0) traceQuickExpense('amount_entered', { value: parsed });
            }}
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            style={styles.amountInput}
            maxLength={10}
            accessibilityLabel="Valor da despesa"
          />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.presetRow}>
          {AMOUNT_PRESETS.map((preset) => (
            <Pressable
              key={preset}
              onPress={() => handlePresetAmount(preset)}
              style={styles.presetChip}
              accessibilityRole="button"
              accessibilityLabel={`${preset} euros`}>
              <Text variant="caption" color="textSecondary">
                {preset}€
              </Text>
            </Pressable>
          ))}
          {lastExpense ? (
            <Pressable
              onPress={handleRepeatLast}
              style={[styles.presetChip, styles.repeatChip]}
              accessibilityRole="button"
              accessibilityLabel="Repetir última despesa">
              <Text variant="caption" color="primary">
                Repetir
              </Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </View>

      <View style={styles.categoryBlock}>
        <Text variant="label" color="textMuted">
          Categoria
        </Text>
        <View style={styles.categoryGrid}>
          {QUICK_CATEGORIES.map((category) => {
            const selected = category.id === categoryId;
            return (
              <Pressable
                key={category.id}
                onPress={() => handleSelectCategory(category.id)}
                style={[styles.categoryButton, selected && styles.categoryButtonSelected]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={category.label}>
                <SymbolView
                  name={category.icon}
                  tintColor={selected ? colors.textInverse : colors.text}
                  size={22}
                />
                <Text
                  variant="caption"
                  color={selected ? 'textInverse' : 'textSecondary'}
                  numberOfLines={1}>
                  {category.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.noteBlock}>
        <Text variant="label" color="textMuted">
          Comerciante (opcional)
        </Text>
        <TextInput
          value={merchant}
          onChangeText={setMerchant}
          placeholder="Ex.: Continente"
          placeholderTextColor={colors.textMuted}
          style={styles.noteInput}
          maxLength={120}
          autoCapitalize="words"
        />
      </View>

      <View style={styles.noteBlock}>
        <Text variant="label" color="textMuted">
          Nota (opcional)
        </Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Ex.: almoço com equipa"
          placeholderTextColor={colors.textMuted}
          style={styles.noteInput}
          maxLength={80}
          returnKeyType="done"
        />
      </View>

      {error ? (
        <Text variant="caption" color="danger">
          {error}
        </Text>
      ) : null}

      <Button
        label="Guardar despesa"
        onPress={() => void handleSave()}
        fullWidth
        size="lg"
        loading={createMutation.isPending}
        disabled={!isValid || createMutation.isPending}
        icon={
          <SymbolView
            name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
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
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  headerTitle: {
    flex: 1,
  },
  content: {
    gap: spacing.xl,
    paddingBottom: spacing.xl,
  },
  spendableChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.primaryMuted,
  },
  amountBlock: {
    gap: spacing.sm,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    minHeight: 64,
  },
  currencySymbol: {
    fontSize: 36,
    fontWeight: '600',
    lineHeight: 56,
    color: colors.textSecondary,
    paddingBottom: 4,
    includeFontPadding: false,
  },
  amountInput: {
    flex: 1,
    fontSize: 56,
    fontWeight: '700',
    lineHeight: 64,
    letterSpacing: -1,
    color: colors.text,
    padding: 0,
    paddingVertical: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  presetRow: {
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  presetChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  repeatChip: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  categoryBlock: {
    gap: spacing.md,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryButton: {
    width: '23%',
    minWidth: 74,
    flexGrow: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  categoryButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  noteBlock: {
    gap: spacing.sm,
  },
  noteInput: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
});
