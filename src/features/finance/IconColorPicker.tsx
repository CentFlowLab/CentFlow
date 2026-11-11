import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { normalizeSearchText } from '@/core/text/search';
import { Icon, type IconName, Text, TextField } from '@/ui/components';
import { CATEGORY_COLOR_KEYS, categorySwatch, radius, spacing, useTheme } from '@/ui/theme';

import { CATEGORY_ICON_GROUPS, categoryIconKeywordKey } from './presentation';

type Props = {
  icon: string;
  color: string;
  onIconChange: (icon: IconName) => void;
  onColorChange: (color: string) => void;
};

/** Paleta de cores e catálogo de ícones com pesquisa (categorias e objetivos). */
export function IconColorPicker({ icon, color, onIconChange, onColorChange }: Props) {
  const { t } = useTranslation();
  const { colors, scheme } = useTheme();
  const [iconQuery, setIconQuery] = useState('');
  const iconKeywords = t('categoryIcons.keywords', { returnObjects: true }) as Record<
    string,
    string
  >;
  const iconLabel = (choice: IconName) =>
    iconKeywords[categoryIconKeywordKey(choice)]?.split(',')[0]?.trim() ?? choice;
  // Cerca de 100 ícones: filtrar a cada render é barato.
  const query = normalizeSearchText(iconQuery.trim());
  const iconGroups = CATEGORY_ICON_GROUPS.map((group) => ({
    id: group.id,
    icons: (group.icons as readonly IconName[]).filter(
      (choice) =>
        !query ||
        normalizeSearchText(iconKeywords[categoryIconKeywordKey(choice)] ?? '').includes(query),
    ),
  })).filter((group) => group.icons.length > 0);
  const swatch = categorySwatch(color, scheme);

  return (
    <>
      <View style={styles.field}>
        <Text variant="label" tone="secondary">
          {t('categoryForm.color')}
        </Text>
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={t('categoryForm.color')}
          style={styles.grid}>
          {CATEGORY_COLOR_KEYS.map((key) => {
            const selected = key === color;
            const option = categorySwatch(key, scheme);
            return (
              <Pressable
                key={key}
                accessibilityRole="radio"
                accessibilityLabel={t(`categories.colors.${key}`)}
                accessibilityState={{ checked: selected }}
                onPress={() => onColorChange(key)}
                style={[
                  styles.swatch,
                  {
                    backgroundColor: option.foreground,
                    borderColor: selected ? colors.text : 'transparent',
                  },
                ]}>
                {selected ? (
                  <Icon name="checkmark" size={18} colorValue={option.background} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.field}>
        <Text variant="label" tone="secondary">
          {t('categoryForm.icon')}
        </Text>
        <TextField
          label={t('categoryForm.iconSearch')}
          value={iconQuery}
          onChangeText={setIconQuery}
          placeholder={t('categoryForm.iconSearchPlaceholder')}
          autoCorrect={false}
          returnKeyType="search"
        />
        {iconGroups.length === 0 ? (
          <Text variant="footnote" tone="secondary">
            {t('categoryForm.iconNoResults')}
          </Text>
        ) : null}
        {iconGroups.map((group) => (
          <View key={group.id} style={styles.iconGroup}>
            <Text variant="footnote" tone="tertiary" accessibilityRole="header">
              {t(`categoryIcons.groups.${group.id}`)}
            </Text>
            <View
              accessibilityRole="radiogroup"
              accessibilityLabel={t(`categoryIcons.groups.${group.id}`)}
              style={styles.grid}>
              {group.icons.map((choice) => {
                const selected = choice === icon;
                return (
                  <Pressable
                    key={choice}
                    accessibilityRole="radio"
                    accessibilityLabel={iconLabel(choice)}
                    accessibilityState={{ checked: selected }}
                    aria-checked={selected}
                    onPress={() => onIconChange(choice)}
                    style={[
                      styles.iconOption,
                      {
                        backgroundColor: selected ? swatch.background : colors.surface,
                        borderColor: selected ? swatch.foreground : colors.border,
                      },
                    ]}>
                    <Icon
                      name={choice}
                      size={20}
                      colorValue={selected ? swatch.foreground : colors.textSecondary}
                    />
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.sm },
  iconGroup: { gap: spacing.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
