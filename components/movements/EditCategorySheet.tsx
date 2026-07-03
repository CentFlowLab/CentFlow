import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { DraggableBottomSheet } from '@/components/layout';
import { Button, Text } from '@/components/ui';
import {
  CATEGORY_COLOR_OPTIONS,
  suggestEmojiForCategoryName,
  type CustomCategory,
} from '@/lib/data/custom-categories-storage';
import { colors, radius, spacing } from '@/lib/theme';

type EditCategorySheetProps = {
  visible: boolean;
  category: CustomCategory | null;
  onClose: () => void;
  onSave: (patch: {
    name: string;
    emoji: string;
    color: string;
    emojiManual: boolean;
  }) => Promise<void>;
};

export function EditCategorySheet({
  visible,
  category,
  onClose,
  onSave,
}: EditCategorySheetProps) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [color, setColor] = useState<string>(CATEGORY_COLOR_OPTIONS[0]);
  const [emojiManual, setEmojiManual] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !category) return;
    setName(category.name);
    setEmoji(category.emoji);
    setColor(category.color);
    setEmojiManual(Boolean(category.emojiManual));
    setError(null);
  }, [visible, category]);

  useEffect(() => {
    if (!visible || emojiManual) return;
    setEmoji(suggestEmojiForCategoryName(name, emoji, false));
  }, [name, visible, emojiManual, emoji]);

  if (!category) return null;

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Indica um nome para a categoria.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        name: trimmed,
        emoji: emoji.trim() || suggestEmojiForCategoryName(trimmed),
        color,
        emojiManual,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível guardar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <DraggableBottomSheet
      visible={visible}
      onClose={onClose}
      maxHeight="70%"
      header={() => (
        <Text variant="h3" style={styles.title}>
          Editar categoria
        </Text>
      )}>
      <View style={styles.form}>
        <Text variant="label" color="textMuted">
          Nome
        </Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Ex: Tabaco"
          placeholderTextColor={colors.textMuted}
          autoCorrect={false}
        />

        <Text variant="label" color="textMuted">
          Emoji
        </Text>
        <View style={styles.emojiRow}>
          <Text style={styles.emojiPreview}>{emoji || '🏷️'}</Text>
          <TextInput
            style={[styles.input, styles.emojiInput]}
            value={emoji}
            onChangeText={(value) => {
              setEmojiManual(true);
              setEmoji(value);
            }}
            placeholder="🏷️"
            placeholderTextColor={colors.textMuted}
            maxLength={4}
          />
        </View>

        <Text variant="label" color="textMuted">
          Cor
        </Text>
        <View style={styles.colorRow}>
          {CATEGORY_COLOR_OPTIONS.map((option) => {
            const selected = color === option;
            return (
              <Pressable
                key={option}
                onPress={() => setColor(option)}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: option },
                  selected && styles.colorSwatchSelected,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              />
            );
          })}
        </View>

        {error ? (
          <Text variant="caption" color="danger">
            {error}
          </Text>
        ) : null}

        <Button
          label={saving ? 'A guardar...' : 'Guardar'}
          onPress={handleSave}
          loading={saving}
          fullWidth
        />
      </View>
    </DraggableBottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: spacing.md,
  },
  form: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: 16,
    backgroundColor: colors.surface,
  },
  emojiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  emojiPreview: {
    fontSize: 28,
    width: 40,
    textAlign: 'center',
  },
  emojiInput: {
    flex: 1,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
  },
  colorSwatchSelected: {
    borderWidth: 2,
    borderColor: colors.text,
  },
});
