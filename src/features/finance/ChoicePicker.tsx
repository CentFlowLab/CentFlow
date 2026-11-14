import { Fragment, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { isCurrencyCode, COMMON_CURRENCIES } from '@/core/money';
import { normalizeSearchText } from '@/core/text/search';
import { useLocaleFormat } from '@/i18n';
import {
  Button,
  Divider,
  Icon,
  IconButton,
  ListItem,
  Text,
  TextField,
  type IconName,
} from '@/ui/components';
import { radius, spacing, useTheme } from '@/ui/theme';

export type Choice<T extends string> = { value: T; label: string; hint?: string };

/**
 * Lista de escolha numa janela (o padrão do seletor de categorias): pesquisa quando a lista é
 * longa, a opção atual marcada, Escape fecha na web. Para preferências com muitas opções.
 */
export function ChoiceSheet<T extends string>({
  visible,
  title,
  choices,
  value,
  onChange,
  onDismiss,
  searchLabel,
  footer,
}: {
  visible: boolean;
  title: string;
  choices: readonly Choice<T>[];
  value: T;
  onChange: (value: T) => void;
  onDismiss: () => void;
  /** Com rótulo, mostra a pesquisa (por nome ou dica). */
  searchLabel?: string;
  /** Conteúdo por baixo da lista (ex.: escrever um código). */
  footer?: ReactNode;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const needle = normalizeSearchText(query.trim());
  const shown = needle
    ? choices.filter((choice) =>
        normalizeSearchText(`${choice.label} ${choice.hint ?? ''} ${choice.value}`).includes(
          needle,
        ),
      )
    : choices;
  const close = () => {
    setQuery('');
    onDismiss();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
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
          <View style={styles.header}>
            <Text variant="title3" style={styles.flex}>
              {title}
            </Text>
            <IconButton icon="close" accessibilityLabel={t('common.close')} onPress={close} />
          </View>
          {searchLabel ? (
            <TextField
              label={searchLabel}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
            />
          ) : null}
          <ScrollView
            style={styles.list}
            keyboardShouldPersistTaps="handled"
            accessibilityRole="radiogroup"
            accessibilityLabel={title}>
            {shown.length === 0 ? (
              <Text variant="callout" tone="secondary" style={styles.empty}>
                {t('categoryPicker.noResults')}
              </Text>
            ) : (
              shown.map((choice, index) => (
                <Fragment key={choice.value}>
                  {index > 0 ? <Divider /> : null}
                  <ListItem
                    title={choice.label}
                    subtitle={choice.hint}
                    selected={choice.value === value}
                    showChevron={false}
                    trailing={
                      choice.value === value ? (
                        <Icon name="checkmark" size={20} color="primaryText" />
                      ) : undefined
                    }
                    onPress={() => {
                      onChange(choice.value);
                      close();
                    }}
                  />
                </Fragment>
              ))
            )}
          </ScrollView>
          {footer}
        </View>
      </View>
    </Modal>
  );
}

/** Nome da moeda no idioma (quando o motor o sabe), senão o código. */
export function useCurrencyName(): (code: string) => string {
  const { locale } = useLocaleFormat();
  return (code: string) => {
    try {
      const names = new Intl.DisplayNames([locale], { type: 'currency' });
      return names.of(code) ?? code;
    } catch {
      return code;
    }
  };
}

/**
 * Linha de preferência com a moeda atual que abre a lista de moedas: "Automática" (se
 * `autoLabel`), as moedas comuns e "Outra moeda (código ISO)", validada como qualquer código.
 */
export function CurrencyPreferenceRow({
  icon,
  title,
  value,
  autoLabel,
  onChange,
  trailingValue,
}: {
  icon: IconName;
  title: string;
  value: 'auto' | string;
  autoLabel: string;
  onChange: (value: 'auto' | string) => void;
  trailingValue: ReactNode;
}) {
  const { t } = useTranslation();
  const currencyName = useCurrencyName();
  const [open, setOpen] = useState(false);
  const [other, setOther] = useState('');
  const [otherError, setOtherError] = useState<string>();
  const codes: string[] = [...COMMON_CURRENCIES];
  if (value !== 'auto' && !codes.includes(value)) codes.push(value);
  const choices: Choice<string>[] = [
    { value: 'auto', label: autoLabel },
    ...codes.map((code) => ({ value: code, label: code, hint: currencyName(code) })),
  ];
  const useOther = () => {
    const code = other.trim().toUpperCase();
    if (!isCurrencyCode(code)) {
      setOtherError(t('settings.currencyPrefs.otherInvalid'));
      return;
    }
    onChange(code);
    setOther('');
    setOtherError(undefined);
    setOpen(false);
  };

  return (
    <>
      <ListItem
        icon={icon}
        iconColor="textSecondary"
        iconBackground="surfaceMuted"
        title={title}
        trailing={trailingValue}
        onPress={() => setOpen(true)}
      />
      <ChoiceSheet
        visible={open}
        title={title}
        choices={choices}
        value={value}
        searchLabel={t('settings.currencyPrefs.search')}
        onChange={onChange}
        onDismiss={() => setOpen(false)}
        footer={
          <View style={styles.other}>
            <Text variant="label" tone="secondary">
              {t('settings.currencyPrefs.other')}
            </Text>
            <View style={styles.otherRow}>
              <View style={styles.flex}>
                <TextField
                  label={t('settings.currencyPrefs.otherLabel')}
                  value={other}
                  onChangeText={(text) => {
                    setOther(text);
                    setOtherError(undefined);
                  }}
                  autoCapitalize="characters"
                  maxLength={3}
                  errorText={otherError}
                />
              </View>
              <Button
                label={t('settings.currencyPrefs.use')}
                variant="secondary"
                size="sm"
                onPress={useOther}
              />
            </View>
          </View>
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
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
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  list: { flexGrow: 0 },
  empty: { padding: spacing.lg },
  other: { gap: spacing.sm },
  otherRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
});
