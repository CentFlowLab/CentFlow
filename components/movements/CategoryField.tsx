import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { DraggableBottomSheet } from '@/components/layout';
import { Text } from '@/components/ui';
import { useCustomCategories, type CustomCategory } from '@/hooks/useCustomCategories';
import { getAutoEmoji, resolveCategoryEmoji } from '@/lib/categories/emoji-map';
import {
  CUSTOM_CATEGORY_ICON,
  getCategoryGroups,
  type CategoryGroup,
  type TransactionCategory,
} from '@/lib/data/transaction-categories';
import type { CashTransactionType } from '@/lib/domain/transaction.types';
import { colors, radius, spacing } from '@/lib/theme';

import { EditCategorySheet } from './EditCategorySheet';

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

function findCustomCategory(
  categories: CustomCategory[],
  value: string,
): CustomCategory | undefined {
  return categories.find((c) => c.name.toLowerCase() === value.toLowerCase());
}

/** Linha do formulário que mostra a categoria escolhida e abre o seletor. */
export function CategoryField({ type, value, onChange, label = 'Categoria', error }: CategoryFieldProps) {
  const [pickerVisible, setPickerVisible] = useState(false);
  const { customCategories } = useCustomCategories(type);

  const selected = useMemo<{ label: string; icon?: SymbolViewProps['name']; emoji?: string } | null>(() => {
    if (!value) return null;
    for (const group of getCategoryGroups(type)) {
      const found = group.items.find((item) => item.id === value);
      if (found) return { label: found.label, icon: found.icon };
    }
    const custom = findCustomCategory(customCategories, value);
    if (custom) {
      return { label: custom.name, emoji: resolveCategoryEmoji(custom.name, custom.emoji) };
    }
    return {
      label: value,
      emoji: resolveCategoryEmoji(value),
    };
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
            {selected.emoji ? (
              <Text style={styles.emojiIcon}>{selected.emoji}</Text>
            ) : selected.icon ? (
              <SymbolView name={selected.icon} tintColor={colors.primary} size={22} />
            ) : (
              <SymbolView name={CUSTOM_CATEGORY_ICON} tintColor={colors.primary} size={22} />
            )}
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
  onLongPress,
}: {
  item: TransactionCategory & { emoji?: string; isCustom?: boolean };
  selected: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      style={({ pressed }) => [styles.itemRow, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={item.label}>
      {item.emoji ? (
        <Text style={styles.rowEmoji}>{item.emoji}</Text>
      ) : (
        <SymbolView
          name={item.icon}
          tintColor={selected ? colors.primary : colors.textSecondary}
          size={22}
        />
      )}
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

export function CategoryPickerSheet({ visible, type, value, onClose, onSelect }: CategoryPickerSheetProps) {
  const [query, setQuery] = useState('');
  const [editingCategory, setEditingCategory] = useState<CustomCategory | null>(null);
  const {
    customCategories,
    addCustomCategory,
    updateCustomCategory,
    deleteCustomCategory,
    getUsageCount,
  } = useCustomCategories(type);

  const trimmedQuery = query.trim();
  const normalizedQuery = normalize(trimmedQuery);
  const suggestedEmoji = trimmedQuery ? getAutoEmoji(trimmedQuery) : null;

  const customGroup = useMemo<CategoryGroup | null>(() => {
    if (customCategories.length === 0) return null;
    return {
      title: 'As minhas categorias',
      items: customCategories.map((category) => ({
        id: category.name,
        label: category.name,
        icon: CUSTOM_CATEGORY_ICON,
        emoji: resolveCategoryEmoji(category.name, category.emoji),
        isCustom: true,
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
    await addCustomCategory(trimmedQuery, {
      emoji: suggestedEmoji ?? undefined,
    });
    onSelect(trimmedQuery);
    setQuery('');
  }

  function handleCustomLongPress(category: CustomCategory) {
    if (Platform.OS === 'web') {
      const action = globalThis.prompt?.(
        `Categoria «${category.name}»\nEscreve: editar | eliminar`,
      );
      if (action?.toLowerCase() === 'editar') setEditingCategory(category);
      if (action?.toLowerCase() === 'eliminar') void confirmDelete(category);
      return;
    }

    Alert.alert(category.name, undefined, [
      { text: 'Editar', onPress: () => setEditingCategory(category) },
      { text: 'Eliminar', style: 'destructive', onPress: () => void confirmDelete(category) },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  async function confirmDelete(category: CustomCategory) {
    const count = await getUsageCount(category.name);
    const message =
      count > 0
        ? `Tens ${count} movimento${count === 1 ? '' : 's'} com esta categoria. Ao eliminar, passam para «Outros». Continuar?`
        : 'Tens a certeza que queres eliminar esta categoria?';

    if (Platform.OS === 'web') {
      if (typeof globalThis.confirm === 'function' && globalThis.confirm(message)) {
        await deleteCustomCategory(category.name);
        if (value.toLowerCase() === category.name.toLowerCase()) onSelect('other');
      }
      return;
    }

    Alert.alert('Eliminar categoria', message, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await deleteCustomCategory(category.name);
          if (value.toLowerCase() === category.name.toLowerCase()) onSelect('other');
        },
      },
    ]);
  }

  return (
    <>
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
              {suggestedEmoji && trimmedQuery ? (
                <Text style={styles.searchEmojiHint}>{suggestedEmoji}</Text>
              ) : null}
            </View>
          </View>
        )}>
        {hasResults ? (
          groups.map((group) => (
            <View key={group.title} style={styles.group}>
              <Text variant="label" color="textMuted" style={styles.groupTitle}>
                {group.title.toUpperCase()}
              </Text>
              {group.items.map((item) => {
                const custom = group.title === 'As minhas categorias'
                  ? findCustomCategory(customCategories, item.id)
                  : undefined;
                return (
                  <CategoryRow
                    key={`${group.title}-${item.id}`}
                    item={item as TransactionCategory & { emoji?: string; isCustom?: boolean }}
                    selected={item.id === value}
                    onPress={() => onSelect(item.id)}
                    onLongPress={
                      custom ? () => handleCustomLongPress(custom) : undefined
                    }
                  />
                );
              })}
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
              <Text style={styles.ctaEmoji}>{suggestedEmoji ?? '🏷️'}</Text>
              <Text variant="bodyMedium" color="primary" style={styles.rowLabel}>
                Usar «{trimmedQuery}» como categoria personalizada
              </Text>
            </Pressable>
          </View>
        )}
      </DraggableBottomSheet>

      <EditCategorySheet
        visible={Boolean(editingCategory)}
        category={editingCategory}
        onClose={() => setEditingCategory(null)}
        onSave={async (patch) => {
          if (!editingCategory) return;
          await updateCustomCategory(editingCategory.name, patch);
          if (value.toLowerCase() === editingCategory.name.toLowerCase()) {
            onSelect(patch.name);
          }
        }}
      />
    </>
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
  emojiIcon: {
    fontSize: 22,
    width: 24,
    textAlign: 'center',
  },
  rowEmoji: {
    fontSize: 22,
    width: 24,
    textAlign: 'center',
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
  searchEmojiHint: {
    fontSize: 20,
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
  ctaEmoji: {
    fontSize: 20,
  },
});
