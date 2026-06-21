import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

import { Text, TextField } from '@/components/ui';
import { colors, radius, spacing } from '@/lib/theme';

export type SearchableSelectOption = {
  id: string;
  label: string;
  searchText?: string;
};

type SearchableSelectProps = {
  label: string;
  placeholder?: string;
  value: string;
  options: SearchableSelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function SearchableSelect({
  label,
  placeholder = 'Seleccionar...',
  value,
  options,
  onChange,
  disabled = false,
  style,
}: SearchableSelectProps) {
  const { modalBottomPadding } = useResponsiveLayout();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selectedLabel = options.find((item) => item.id === value)?.label ?? placeholder;

  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return options;
    return options.filter((item) => {
      const haystack = item.searchText ?? `${item.id} ${item.label}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [options, query]);

  function handleSelect(id: string) {
    onChange(id);
    setOpen(false);
    setQuery('');
  }

  return (
    <View style={[styles.wrapper, style]}>
      <Text variant="caption" color="textSecondary" style={styles.label}>
        {label}
      </Text>

      <Pressable
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.trigger,
          disabled && styles.triggerDisabled,
          pressed && !disabled && styles.triggerPressed,
        ]}>
        <Text variant="body" color={value ? 'text' : 'textMuted'} numberOfLines={1} style={styles.triggerText}>
          {selectedLabel}
        </Text>
        <SymbolView
          name={{ ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }}
          tintColor={colors.textMuted}
          size={18}
        />
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={[styles.sheet, { paddingBottom: modalBottomPadding }]}>
          <View style={styles.sheetHeader}>
            <Text variant="h3">{label}</Text>
            <Pressable onPress={() => setOpen(false)} hitSlop={12}>
              <SymbolView
                name={{ ios: 'xmark.circle.fill', android: 'close', web: 'close' }}
                tintColor={colors.textMuted}
                size={24}
              />
            </Pressable>
          </View>

          <TextField
            label="Pesquisar"
            value={query}
            onChangeText={setQuery}
            placeholder="Escreve para filtrar..."
            autoFocus
          />

          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled">
            {filteredOptions.length === 0 ? (
              <Text variant="body" color="textMuted" style={styles.empty}>
                Nenhum resultado encontrado.
              </Text>
            ) : (
              filteredOptions.map((item) => {
                const selected = item.id === value;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => handleSelect(item.id)}
                    style={({ pressed }) => [
                      styles.option,
                      selected && styles.optionSelected,
                      pressed && styles.optionPressed,
                    ]}>
                    <Text
                      variant="body"
                      color={selected ? 'primary' : 'text'}
                      numberOfLines={2}
                      style={selected ? styles.optionTextSelected : undefined}>
                      {item.label}
                    </Text>
                    {selected ? (
                      <SymbolView
                        name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
                        tintColor={colors.primary}
                        size={20}
                      />
                    ) : null}
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
  },
  label: {
    fontWeight: '600',
  },
  trigger: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  triggerDisabled: {
    opacity: 0.6,
  },
  triggerPressed: {
    backgroundColor: colors.surfaceElevated,
  },
  triggerText: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    maxHeight: '78%',
    backgroundColor: colors.backgroundElevated,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.md,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  list: {
    maxHeight: 420,
  },
  listContent: {
    gap: spacing.xs,
    paddingBottom: spacing.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  optionPressed: {
    opacity: 0.92,
  },
  optionTextSelected: {
    fontWeight: '600',
  },
  empty: {
    paddingVertical: spacing.xl,
    textAlign: 'center',
  },
});
