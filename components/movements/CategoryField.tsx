import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { DraggableBottomSheet } from '@/components/layout';
import { Text } from '@/components/ui';
import { useCustomCategories } from '@/hooks/useCustomCategories';
import {
  CUSTOM_CATEGORY_ICON,
  getCategoryGroups,
  type CategoryGroup,
  type TransactionCategory,
} from '@/lib/data/transaction-categories';
import type { CashTransactionType } from '@/lib/domain/transaction.types';
import { colors, radius, spacing } from '@/lib/theme';

type CategoryFieldProps = {
  type: CashTransactionType;
  value: string;
  onChange: (categoryId: string) => void;
  label?: string;
  error?: string;
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Linha do formulário que mostra a categoria escolhida e abre o seletor. */
export function CategoryField({ type, value, onChange, label = 'Categoria', error }: CategoryFieldProps) {
  const [pickerVisible, setPickerVisible] = useState(false);
  const { customCategories } = useCustomCategories(type);

  const selected = useMemo<{ label: string; icon: SymbolViewProps['name'] } | null>(() => {
    if (!value) return null;
    for (const group of getCategoryGroups(type)) {
      const found = group.items.find((item) => item.id === value);
      if (found) return { label: found.label, icon: found.icon };
    }
    if (customCategories.some((c) => c.toLowerCase() === value.toLowerCase())) {
      return { label: value, icon: CUSTOM_CATEGORY_ICON };
    }
    return { label: value, icon: CUSTOM_CATEGORY_ICON };
  }, [value, type, customCategories]);

  return (
    <View style={styles.wrapper}>
      <Text variant="label" color="textMuted">
        {label}
      </Text>
      <Pressable
        onPress={() => setPickerVisible(true)}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed, error && styles.rowError]}
        accessibilityRole="button"
        accessibilityLabel={selected ? `Categoria: ${selected.label}` : 'Escolher categoria'}>
        {selected ? (
          <>
            <SymbolView name={selected.icon} tintColor={colors.primary} size={22} />
            <Text variant="bodyMedium" style={styles.rowLabel}>
              {selected.label}
            </Text>
          </>
        ) : (
          <Text variant="bodyMedium" color="textMuted" style={styles.rowLabel}>
            Escolher categoria
          </Text>
        )}
        <SymbolView
          name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
          tintColor={colors.textMuted}
          size={16}
        />
      </Pressable>
      {error ? (
        <Text variant="caption" color="danger">
          {error}
        </Text>
      ) : null}

      <CategoryPickerSheet
        visible={pickerVisible}
        type={type}
        value={value}
        onClose={() => setPickerVisible(false)}
        onSelect={(id) => {
          onChange(id);
          setPickerVisible(false);
        }}
      />
    </View>
  );
}

type CategoryPickerSheetProps = {
  visible: boolean;
  type: CashTransactionType;
  value: string;
  onClose: () => void;
  onSelect: (categoryId: string) => void;
};

function CategoryRow({
  item,
  selected,
  onPress,
}: {
  item: TransactionCategory;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.itemRow, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={item.label}>
      <SymbolView
        name={item.icon}
        tintColor={selected ? colors.primary : colors.textSecondary}
        size={22}
      />
      <Text variant="bodyMedium" color={selected ? 'primary' : undefined} style={styles.rowLabel}>
        {item.label}
      </Text>
      {selected ? (
        <SymbolView
          name={{ ios: 'checkmark', android: 'check', web: 'check' }}
          tintColor={colors.primary}
          size={16}
        />
      ) : null}
    </Pressable>
  );
}

function CategoryPickerSheet({ visible, type, value, onClose, onSelect }: CategoryPickerSheetProps) {
  const [query, setQuery] = useState('');
  const { customCategories, addCustomCategory } = useCustomCategories(type);

  const trimmedQuery = query.trim();
  const normalizedQuery = normalize(trimmedQuery);

  const customGroup = useMemo<CategoryGroup | null>(() => {
    if (customCategories.length === 0) return null;
    return {
      title: 'As minhas categorias',
      items: customCategories.map((labelText) => ({
        id: labelText,
        label: labelText,
        icon: CUSTOM_CATEGORY_ICON,
      })),
    };
  }, [customCategories]);

  const groups = useMemo<CategoryGroup[]>(() => {
    const base = customGroup ? [customGroup, ...getCategoryGroups(type)] : getCategoryGroups(type);
    if (!normalizedQuery) return base;

    return base
      .map((group) => {
        const groupMatches = normalize(group.title).includes(normalizedQuery);
        const items = group.items.filter(
          (item) => groupMatches || normalize(item.label).includes(normalizedQuery),
        );
        return { ...group, items };
      })
      .filter((group) => group.items.length > 0);
  }, [customGroup, type, normalizedQuery]);

  const hasResults = groups.some((group) => group.items.length > 0);

  async function handleUseCustom() {
    if (!trimmedQuery) return;
    await addCustomCategory(trimmedQuery);
    onSelect(trimmedQuery);
    setQuery('');
  }

  return (
    <DraggableBottomSheet
      visible={visible}
      onClose={() => {
        setQuery('');
        onClose();
      }}
      maxHeight="88%"
      scrollContentStyle={styles.sheetContent}
      header={() => (
        <View style={styles.sheetHeader}>
          <Text variant="h3">Categoria</Text>
          <View style={styles.searchRow}>
            <SymbolView
              name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
              tintColor={colors.textMuted}
              size={18}
            />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Procurar categoria..."
              placeholderTextColor={colors.textMuted}
              autoFocus
              autoCorrect={false}
              returnKeyType="search"
            />
          </View>
        </View>
      )}>
      {hasResults ? (
        groups.map((group) => (
          <View key={group.title} style={styles.group}>
            <Text variant="label" color="textMuted" style={styles.groupTitle}>
              {group.title.toUpperCase()}
            </Text>
            {group.items.map((item) => (
              <CategoryRow
                key={`${group.title}-${item.id}`}
                item={item}
                selected={item.id === value}
                onPress={() => onSelect(item.id)}
              />
            ))}
          </View>
        ))
      ) : (
        <View style={styles.emptyState}>
          <Text variant="bodyMedium" color="textSecondary">
            Sem resultados para «{trimmedQuery}»
          </Text>
          <Pressable
            onPress={handleUseCustom}
            style={({ pressed }) => [styles.customCta, pressed && styles.rowPressed]}
            accessibilityRole="button"
            accessibilityLabel={`Usar ${trimmedQuery} como categoria personalizada`}>
            <SymbolView name={CUSTOM_CATEGORY_ICON} tintColor={colors.primary} size={20} />
            <Text variant="bodyMedium" color="primary" style={styles.rowLabel}>
              Usar «{trimmedQuery}» como categoria personalizada
            </Text>
          </Pressable>
        </View>
      )}
    </DraggableBottomSheet>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  rowPressed: {
    backgroundColor: colors.surfaceHighlight,
  },
  rowError: {
    borderColor: colors.danger,
  },
  rowLabel: {
    flex: 1,
  },
  sheetHeader: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    paddingVertical: 0,
  },
  sheetContent: {
    paddingBottom: spacing['2xl'],
  },
  group: {
    marginBottom: spacing.lg,
  },
  groupTitle: {
    marginBottom: spacing.xs,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  emptyState: {
    gap: spacing.md,
    paddingVertical: spacing.xl,
    alignItems: 'flex-start',
  },
  customCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
});
