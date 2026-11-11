import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  hasErrors,
  validateCategoryInput,
  ValidationError,
  type CategoryField,
  type CategoryInput,
  type CategoryType,
} from '@/core/finance';
import { CategoryInUseError, useRepositories, type CategoryWithUsage } from '@/data';
import {
  Button,
  Chip,
  ChipGroup,
  Dialog,
  FormScreen,
  Icon,
  type IconName,
  SegmentedControl,
  Text,
  TextField,
} from '@/ui/components';
import { CATEGORY_COLOR_KEYS, categorySwatch, radius, spacing, useTheme } from '@/ui/theme';

import { closeModal } from '../finance/navigation';
import {
  CATEGORY_ICON_CHOICES,
  CATEGORY_ICON_GROUPS,
  categoryIconKeywordKey,
  validationMessage,
} from '../finance/presentation';
import { normalizeSearchText } from '@/core/text/search';

type FieldErrors = Partial<Record<CategoryField, string>>;

type Props = {
  category?: CategoryWithUsage;
  /** Outras categorias (para reatribuir movimentos ao eliminar). */
  others: readonly CategoryWithUsage[];
  initialType?: CategoryType;
};

export function CategoryForm({ category, others, initialType = 'expense' }: Props) {
  const { t } = useTranslation();
  const { colors, scheme } = useTheme();
  const repositories = useRepositories();
  const isEditing = category !== undefined;
  const typeLocked = (category?.entryCount ?? 0) > 0;

  const [name, setName] = useState(category?.name ?? '');
  const [type, setType] = useState<CategoryType>(category?.type ?? initialType);
  const [icon, setIcon] = useState(
    category?.icon ?? CATEGORY_ICON_CHOICES[0] ?? 'pricetag-outline',
  );
  const [color, setColor] = useState(category?.color ?? 'indigo');
  const [essential, setEssential] = useState(category?.essential ?? false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<'none' | 'confirmDelete' | 'reassign'>('none');
  const [reassignTo, setReassignTo] = useState<string | null>(null);
  const [iconQuery, setIconQuery] = useState('');
  const iconKeywords = t('categoryIcons.keywords', { returnObjects: true }) as Record<
    string,
    string
  >;
  const iconLabel = (choice: IconName) =>
    iconKeywords[categoryIconKeywordKey(choice)]?.split(',')[0]?.trim() ?? choice;
  // Cerca de 100 ícones: filtrar a cada render é barato.
  const iconGroups = (() => {
    const query = normalizeSearchText(iconQuery.trim());
    return CATEGORY_ICON_GROUPS.map((group) => ({
      id: group.id,
      icons: (group.icons as readonly IconName[]).filter(
        (choice) =>
          !query ||
          normalizeSearchText(iconKeywords[categoryIconKeywordKey(choice)] ?? '').includes(query),
      ),
    })).filter((group) => group.icons.length > 0);
  })();

  const close = () => closeModal('/categories');
  const dismiss = () => setDialog('none');
  const reassignChoices = others.filter(
    (other) => other.type === category?.type && other.id !== category?.id,
  );

  const run = async (operation: () => Promise<void>) => {
    setBusy(true);
    setFormError(null);
    try {
      await operation();
    } catch (error) {
      if (error instanceof ValidationError) {
        const mapped: FieldErrors = {};
        for (const [field, code] of Object.entries(error.errors)) {
          mapped[field as CategoryField] = validationMessage(t, code);
        }
        setErrors(mapped);
        dismiss();
      } else if (error instanceof CategoryInUseError) {
        setDialog('reassign');
      } else {
        setFormError(t('errors.saveFailed'));
        dismiss();
      }
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    const input: CategoryInput = {
      name: name.trim(),
      type,
      icon,
      color,
      essential: type === 'expense' && essential,
    };
    const fieldErrors: FieldErrors = {};
    for (const [field, code] of Object.entries(validateCategoryInput(input))) {
      fieldErrors[field as CategoryField] = validationMessage(t, code);
    }
    setErrors(fieldErrors);
    if (hasErrors(fieldErrors)) return;
    void run(async () => {
      if (category) await repositories.categories.update(category.id, input);
      else await repositories.categories.create(input);
      close();
    });
  };

  const remove = (target?: string) =>
    void run(async () => {
      if (!category) return;
      await repositories.categories.delete(
        category.id,
        target ? { reassignTo: target } : undefined,
      );
      dismiss();
      close();
    });

  const swatch = categorySwatch(color, scheme);

  return (
    <FormScreen
      title={t(isEditing ? 'categoryForm.editTitle' : 'categoryForm.newTitle')}
      closeLabel={t('common.close')}
      onClose={close}
      footer={
        <>
          {formError ? (
            <Text variant="footnote" tone="negative" accessibilityLiveRegion="polite">
              {formError}
            </Text>
          ) : null}
          <Button
            label={t('common.save')}
            icon="checkmark"
            fullWidth
            loading={busy}
            onPress={save}
          />
        </>
      }>
      <View style={styles.preview}>
        <View style={[styles.previewIcon, { backgroundColor: swatch.background }]}>
          <Icon name={icon as never} size={28} colorValue={swatch.foreground} />
        </View>
      </View>

      <TextField
        label={t('categoryForm.name')}
        value={name}
        onChangeText={setName}
        placeholder={t('categoryForm.namePlaceholder')}
        maxLength={60}
        autoFocus={!isEditing}
        errorText={errors.name}
      />

      <View style={styles.field}>
        <Text variant="label" tone="secondary">
          {t('categoryForm.type')}
        </Text>
        {typeLocked ? (
          <Text variant="footnote" tone="tertiary">
            {t('validation.typeLocked')}
          </Text>
        ) : (
          <SegmentedControl
            accessibilityLabel={t('categoryForm.type')}
            value={type}
            onChange={setType}
            options={[
              { value: 'expense', label: t('entryTypes.expense') },
              { value: 'income', label: t('entryTypes.income') },
            ]}
          />
        )}
        {errors.type ? (
          <Text variant="footnote" tone="negative">
            {errors.type}
          </Text>
        ) : null}
      </View>

      {type === 'expense' ? (
        <View style={styles.field}>
          <Text variant="label" tone="secondary">
            {t('categoryForm.essential')}
          </Text>
          <SegmentedControl
            accessibilityLabel={t('categoryForm.essential')}
            value={essential ? 'yes' : 'no'}
            onChange={(value) => setEssential(value === 'yes')}
            options={[
              { value: 'no', label: t('common.no') },
              { value: 'yes', label: t('common.yes') },
            ]}
          />
          <Text variant="footnote" tone="tertiary">
            {t('categoryForm.essentialHelper')}
          </Text>
        </View>
      ) : null}

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
                onPress={() => setColor(key)}
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
                    onPress={() => setIcon(choice)}
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

      {category ? (
        <Button
          label={t('categoryForm.delete')}
          variant="destructive"
          icon="trash-outline"
          onPress={() => setDialog(category.entryCount > 0 ? 'reassign' : 'confirmDelete')}
          disabled={busy}
        />
      ) : null}

      <Dialog
        visible={dialog === 'confirmDelete'}
        title={t('categoryForm.deleteTitle')}
        message={t('categoryForm.deleteMessage')}
        onDismiss={dismiss}
        actions={[
          {
            label: t('categoryForm.delete'),
            variant: 'destructive',
            loading: busy,
            onPress: () => remove(),
          },
          { label: t('common.cancel'), variant: 'secondary', onPress: dismiss },
        ]}
      />

      <Dialog
        visible={dialog === 'reassign'}
        title={t('categoryForm.reassignTitle')}
        message={
          reassignChoices.length > 0
            ? t('categoryForm.reassignMessage', { count: category?.entryCount ?? 0 })
            : t('categoryForm.noReassignTarget')
        }
        onDismiss={dismiss}
        actions={[
          ...(reassignChoices.length > 0
            ? [
                {
                  label: t('categoryForm.reassignAndDelete'),
                  variant: 'destructive' as const,
                  loading: busy,
                  disabled: reassignTo === null,
                  onPress: () => remove(reassignTo ?? undefined),
                },
              ]
            : []),
          { label: t('common.cancel'), variant: 'secondary', onPress: dismiss },
        ]}>
        {reassignChoices.length > 0 ? (
          <ChipGroup label={t('entryForm.category')} hideLabel>
            {reassignChoices.map((choice) => (
              <Chip
                key={choice.id}
                label={choice.name}
                icon={choice.icon as never}
                iconColorValue={categorySwatch(choice.color, scheme).foreground}
                selected={reassignTo === choice.id}
                onPress={() => setReassignTo(choice.id)}
              />
            ))}
          </ChipGroup>
        ) : null}
      </Dialog>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  preview: {
    alignItems: 'center',
  },
  previewIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  field: {
    gap: spacing.sm,
  },
  iconGroup: {
    gap: spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
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
