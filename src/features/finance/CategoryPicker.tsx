import { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import type { Category } from '@/core/finance';
import { normalizeSearchText } from '@/core/text/search';
import {
  CategoryIcon,
  Divider,
  Icon,
  IconButton,
  ListItem,
  Text,
  TextField,
} from '@/ui/components';
import { layout, radius, spacing, useTheme } from '@/ui/theme';

type Props = {
  label: string;
  /** Já filtradas (tipo, disponíveis) e pela ordem escolhida pela pessoa. */
  categories: readonly Pick<Category, 'id' | 'name' | 'icon' | 'color'>[];
  value: string | null;
  onChange: (id: string | null) => void;
  errorText?: string;
  /** Texto quando não há categorias para escolher. */
  emptyText?: string;
  /** Mostra a opção "nenhuma" (categoria opcional). */
  noneLabel?: string;
};

/**
 * Campo de categoria: mostra a escolhida e abre uma lista com pesquisa, em vez de uma parede de
 * botões quando há muitas categorias.
 */
export function CategoryPicker({
  label,
  categories,
  value,
  onChange,
  errorText,
  emptyText,
  noneLabel,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = categories.find((category) => category.id === value) ?? null;
  const needle = normalizeSearchText(query.trim());
  const visible = needle
    ? categories.filter((category) => normalizeSearchText(category.name).includes(needle))
    : categories;

  const close = () => {
    setOpen(false);
    setQuery('');
  };
  const choose = (id: string | null) => {
    onChange(id);
    close();
  };

  if (categories.length === 0 && emptyText) {
    return (
      <View style={styles.container}>
        <Text variant="label" tone="secondary">
          {label}
        </Text>
        <Text variant="footnote" tone="secondary">
          {emptyText}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text variant="label" tone="secondary">
        {label}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.name ?? noneLabel ?? t('categoryPicker.placeholder')}`}
        accessibilityHint={t('categoryPicker.hint')}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.field,
          {
            backgroundColor: pressed ? colors.surfaceHover : colors.surface,
            borderColor: errorText ? colors.negative : colors.border,
            borderWidth: errorText ? 1.5 : 1,
          },
        ]}>
        {selected ? <CategoryIcon icon={selected.icon} color={selected.color} size={28} /> : null}
        <Text
          variant="body"
          tone={selected || noneLabel ? 'primary' : 'tertiary'}
          numberOfLines={1}
          style={styles.flex}>
          {selected?.name ?? noneLabel ?? t('categoryPicker.placeholder')}
        </Text>
        <Icon name="chevron-down" size={18} color="textSecondary" />
      </Pressable>
      {errorText ? (
        <Text variant="footnote" tone="negative" accessibilityLiveRegion="polite">
          {errorText}
        </Text>
      ) : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <View style={styles.root}>
          <Pressable
            style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]}
            accessible={false}
            importantForAccessibility="no"
            onPress={close}
          />
          <View
            accessibilityViewIsModal
            style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.sheetHeader}>
              <Text variant="title3" style={styles.flex}>
                {label}
              </Text>
              <IconButton icon="close" accessibilityLabel={t('common.close')} onPress={close} />
            </View>
            <TextField
              label={t('categoryPicker.search')}
              value={query}
              onChangeText={setQuery}
              placeholder={t('categoryPicker.searchPlaceholder')}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              autoFocus={categories.length > 8}
              onSubmitEditing={() => {
                // Enter com um só resultado escolhe-o.
                if (visible.length === 1 && visible[0]) choose(visible[0].id);
              }}
            />
            <ScrollView
              style={styles.list}
              keyboardShouldPersistTaps="handled"
              accessibilityRole="radiogroup"
              accessibilityLabel={label}>
              {noneLabel && !needle ? (
                <ListItem
                  title={noneLabel}
                  icon="remove-circle-outline"
                  selected={value === null}
                  showChevron={false}
                  onPress={() => choose(null)}
                />
              ) : null}
              {visible.length === 0 ? (
                <Text variant="callout" tone="secondary" style={styles.empty}>
                  {t('categoryPicker.noResults')}
                </Text>
              ) : (
                visible.map((category, index) => (
                  <Fragment key={category.id}>
                    {index > 0 || (noneLabel && !needle) ? <Divider /> : null}
                    <ListItem
                      leading={<CategoryIcon icon={category.icon} color={category.color} />}
                      title={category.name}
                      selected={category.id === value}
                      showChevron={false}
                      trailing={
                        category.id === value ? (
                          <Icon name="checkmark" size={20} color="primary" />
                        ) : undefined
                      }
                      onPress={() => choose(category.id)}
                    />
                  </Fragment>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs + 2 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: layout.minTouchTarget + 4,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.xs,
  },
  flex: { flex: 1 },
  root: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  sheet: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '85%',
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  list: { flexGrow: 0 },
  empty: { padding: spacing.lg },
});
