import { Fragment, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  usePreferences,
  type LanguagePreference,
  type ThemePreference,
} from '@/features/preferences';
import {
  calendarDateToLocalDate,
  financialMonthOf,
  financialMonthRange,
  resolvePrimaryCurrency,
  type Account,
} from '@/core/finance';
import { formatMoney } from '@/core/money';
import { useDataQuery, type Repositories } from '@/data';
import { newAccountCurrencyFor } from '@/features/preferences';
import {
  FORMAT_REGIONS,
  LANGUAGE_META,
  SUPPORTED_LANGUAGES,
  useLocaleFormat,
  type FormatRegion,
} from '@/i18n';
import { analyticsAvailable } from '@/lib/analytics';
import { hapticsAvailable } from '@/lib/haptics';
import { Divider, Icon, ListItem, SegmentedControl, Text } from '@/ui/components';
import { colorsByScheme, layout, radius, spacing, useTheme, type ColorScheme } from '@/ui/theme';

import { ChoiceSheet, CurrencyPreferenceRow, type Choice } from '../finance/ChoicePicker';
import { useToday } from '../finance/useToday';
import { quickEntryAvailable, QuickEntryRow } from './QuickEntrySection';
import {
  NEUTRAL_ICON,
  ROW_DIVIDER_INSET,
  RowValue,
  SettingsGroup,
  SettingsPageHeader,
} from './SettingsBlocks';

const THEME_OPTIONS: readonly ThemePreference[] = ['system', 'light', 'dark'];
const LANGUAGE_OPTIONS: readonly LanguagePreference[] = ['system', ...SUPPORTED_LANGUAGES];

/**
 * Definições › Preferências (ADR-076, ADR-077): aparência, idioma, moeda, formatos, mês
 * financeiro, privacidade e registo de movimentos. Tudo neste aparelho e só de apresentação:
 * nenhuma escolha altera valores guardados.
 */
export function PreferencesPage() {
  const { t } = useTranslation();

  return (
    <>
      <SettingsPageHeader
        title={t('settings.sections.preferences.title')}
        description={t('settings.sections.preferences.description')}
      />

      <SettingsGroup title={t('settings.blocks.theme')} note={t('settings.themeHint')} plain>
        <ThemeChooser />
      </SettingsGroup>

      <SettingsGroup title={t('settings.blocks.language')}>
        <LanguageChooser />
      </SettingsGroup>

      <CurrencyGroup />

      <RegionGroup />

      <FinancialMonthGroup />

      <SettingsGroup title={t('settings.blocks.privacy')} note={t('settings.discreet.description')}>
        <DiscreetRow />
        {analyticsAvailable() ? <AnalyticsRow /> : null}
      </SettingsGroup>
      {analyticsAvailable() ? (
        <Text variant="footnote" tone="tertiary" style={styles.groupNote}>
          {t('settings.analytics.description')}
        </Text>
      ) : null}

      <SettingsGroup title={t('settings.blocks.entries')} note={t('settings.defaultAccount.hint')}>
        <DefaultAccountRow />
        {quickEntryAvailable() ? <QuickEntryRow /> : null}
        {hapticsAvailable ? <HapticsRow /> : null}
      </SettingsGroup>
    </>
  );
}

/**
 * Três opções com uma miniatura do aspeto: escolha direta, sem abrir nada. As cores das
 * miniaturas vêm das paletas do tema, não de valores escritos aqui.
 */
function ThemeChooser() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { preferences, updatePreferences } = usePreferences();
  const [hovered, setHovered] = useState<ThemePreference | null>(null);

  return (
    <View
      style={styles.themeRow}
      accessibilityRole="radiogroup"
      accessibilityLabel={t('settings.appearance')}>
      {THEME_OPTIONS.map((value) => {
        const selected = preferences.theme === value;
        return (
          <Pressable
            key={value}
            accessibilityRole="radio"
            accessibilityLabel={t(`settings.theme.${value}`)}
            aria-checked={selected}
            accessibilityState={{ checked: selected }}
            onPress={() => updatePreferences({ theme: value })}
            onHoverIn={() => setHovered(value)}
            onHoverOut={() => setHovered((current) => (current === value ? null : current))}
            style={({ pressed }) => [
              styles.themeOption,
              {
                backgroundColor: colors.surface,
                borderColor: selected ? colors.primary : colors.border,
              },
              (pressed || hovered === value) &&
                !selected && { backgroundColor: colors.surfaceHover },
            ]}>
            <View style={styles.preview}>
              {value === 'system' ? (
                <>
                  <ThemePreview scheme="light" half="left" />
                  <ThemePreview scheme="dark" half="right" />
                </>
              ) : (
                <ThemePreview scheme={value} />
              )}
            </View>
            <View style={styles.themeLabel}>
              <Text variant="label" tone={selected ? 'accent' : 'primary'}>
                {t(`settings.theme.${value}`)}
              </Text>
              {selected ? <Icon name="checkmark-circle" size={18} color="primaryText" /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Miniatura de um ecrã da Miven no esquema indicado (metade, no caso de "Sistema"). */
function ThemePreview({ scheme, half }: { scheme: ColorScheme; half?: 'left' | 'right' }) {
  const palette = colorsByScheme[scheme];
  return (
    <View
      style={[
        styles.previewPane,
        { backgroundColor: palette.background },
        half === 'left' && styles.previewLeft,
        half === 'right' && styles.previewRight,
      ]}>
      <View style={[styles.previewBar, { backgroundColor: palette.primary }]} />
      <View style={[styles.previewCard, { backgroundColor: palette.surface }]}>
        <View style={[styles.previewLine, { backgroundColor: palette.textTertiary }]} />
        <View style={[styles.previewLineShort, { backgroundColor: palette.border }]} />
      </View>
    </View>
  );
}

/** Idiomas sempre à vista nesta página: a escolha é imediata. */
function LanguageChooser() {
  const { t } = useTranslation();
  const { preferences, updatePreferences } = usePreferences();
  const label = (language: LanguagePreference) =>
    language === 'system' ? t('settings.languageSystem') : LANGUAGE_META[language].nativeName;

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={t('settings.language')}>
      {LANGUAGE_OPTIONS.map((language, index) => {
        const selected = preferences.language === language;
        return (
          <Fragment key={language}>
            {index > 0 ? <Divider inset={ROW_DIVIDER_INSET} /> : null}
            <ListItem
              {...NEUTRAL_ICON}
              icon={language === 'system' ? 'phone-portrait-outline' : 'language-outline'}
              title={label(language)}
              selected={selected}
              showChevron={false}
              trailing={selected ? <Icon name="checkmark" size={20} color="primaryText" /> : null}
              onPress={() => updatePreferences({ language })}
            />
          </Fragment>
        );
      })}
    </View>
  );
}

/** Moedas usadas nas contas ativas (para a moeda principal automática e o aviso). */
function useAccountCurrencies(): { currencies: string[]; accounts: Account[] } {
  const query = useDataQuery(
    useCallback((repositories: Repositories) => repositories.accounts.list(), []),
  );
  const accounts = (query.data ?? []).filter((account) => !account.archivedAt);
  return { accounts, currencies: accounts.map((account) => account.currency) };
}

function CurrencyGroup() {
  const { t } = useTranslation();
  const { preferences, updatePreferences } = usePreferences();
  const { currencies } = useAccountCurrencies();
  const resolved = resolvePrimaryCurrency(preferences.primaryCurrency, currencies);
  const automatic = resolvePrimaryCurrency('auto', currencies);
  const missing =
    preferences.primaryCurrency !== 'auto' &&
    currencies.length > 0 &&
    !currencies.includes(preferences.primaryCurrency);
  const newAccount = newAccountCurrencyFor(preferences);

  return (
    <SettingsGroup
      title={t('settings.blocks.currency')}
      note={
        missing
          ? t('settings.currencyPrefs.noAccounts', {
              currency: preferences.primaryCurrency,
              fallback: resolved,
            })
          : t('settings.currencyPrefs.primaryHint')
      }>
      <CurrencyPreferenceRow
        icon="cash-outline"
        title={t('settings.currencyPrefs.primary')}
        value={preferences.primaryCurrency}
        autoLabel={t('settings.currencyPrefs.autoWith', { currency: automatic })}
        onChange={(primaryCurrency) => updatePreferences({ primaryCurrency })}
        trailingValue={
          <RowValue>
            {preferences.primaryCurrency === 'auto'
              ? t('settings.currencyPrefs.autoWith', { currency: automatic })
              : preferences.primaryCurrency}
          </RowValue>
        }
      />
      <CurrencyPreferenceRow
        icon="wallet-outline"
        title={t('settings.currencyPrefs.newAccount')}
        value={preferences.newAccountCurrency}
        autoLabel={t('settings.currencyPrefs.autoWith', {
          currency: newAccountCurrencyFor({ ...preferences, newAccountCurrency: 'auto' }),
        })}
        onChange={(newAccountCurrency) => updatePreferences({ newAccountCurrency })}
        trailingValue={
          <RowValue>
            {preferences.newAccountCurrency === 'auto'
              ? t('settings.currencyPrefs.autoWith', { currency: newAccount })
              : preferences.newAccountCurrency}
          </RowValue>
        }
      />
    </SettingsGroup>
  );
}

/** Nome da região no idioma da interface (quando o motor o sabe), senão a etiqueta. */
function regionName(tag: string, language: string): string {
  try {
    const names = new Intl.DisplayNames([language], { type: 'language' });
    return names.of(tag) ?? tag;
  } catch {
    return tag;
  }
}

function RegionGroup() {
  const { t, i18n } = useTranslation();
  const { preferences, updatePreferences } = usePreferences();
  const { locale, formatDate, formatPercent } = useLocaleFormat();
  const [open, setOpen] = useState(false);
  const label = (value: 'auto' | FormatRegion) =>
    value === 'auto' ? t('settings.region.auto') : regionName(value, i18n.language);
  const choices: Choice<'auto' | FormatRegion>[] = [
    { value: 'auto', label: t('settings.region.auto') },
    ...FORMAT_REGIONS.map((tag) => ({
      value: tag,
      label: regionName(tag, i18n.language),
      hint: tag,
    })),
  ];
  // Pré-visualização com um valor de exemplo: sempre visível, mesmo no modo discreto.
  const sample = formatMoney({ amountMinor: 123456, currency: 'EUR' }, locale);

  return (
    <SettingsGroup title={t('settings.blocks.region')} note={t('settings.region.note')}>
      <ListItem
        {...NEUTRAL_ICON}
        icon="globe-outline"
        title={t('settings.region.title')}
        trailing={<RowValue>{label(preferences.formatRegion)}</RowValue>}
        onPress={() => setOpen(true)}
      />
      <ListItem
        {...NEUTRAL_ICON}
        icon="calculator-outline"
        title={t('settings.formatsNumbers')}
        trailing={<RowValue>{`${sample} · ${formatPercent(0.25)}`}</RowValue>}
      />
      <ListItem
        {...NEUTRAL_ICON}
        icon="calendar-outline"
        title={t('settings.formatsDates')}
        trailing={<RowValue>{formatDate(new Date(), 'medium')}</RowValue>}
      />
      <ChoiceSheet
        visible={open}
        title={t('settings.region.title')}
        choices={choices}
        value={preferences.formatRegion}
        searchLabel={t('categoryPicker.search')}
        onChange={(formatRegion) => updatePreferences({ formatRegion })}
        onDismiss={() => setOpen(false)}
      />
    </SettingsGroup>
  );
}

function FinancialMonthGroup() {
  const { t } = useTranslation();
  const { preferences, updatePreferences } = usePreferences();
  const { formatDate } = useLocaleFormat();
  const today = useToday();
  const [open, setOpen] = useState(false);
  const startDay = preferences.financialMonthStartDay;
  const dayLabel = (day: number) =>
    day === 1 ? t('settings.financialMonth.civil') : t('settings.financialMonth.day', { day });
  const range = financialMonthRange(financialMonthOf(today, startDay), startDay);
  const short = (date: string) => formatDate(calendarDateToLocalDate(date), 'medium');
  const choices: Choice<string>[] = Array.from({ length: 31 }, (_, index) => ({
    value: String(index + 1),
    label: dayLabel(index + 1),
  }));

  return (
    <SettingsGroup
      title={t('settings.blocks.financialMonth')}
      note={`${t('settings.financialMonth.noteShort')} ${t('settings.financialMonth.noteLocal')}`}>
      <ListItem
        {...NEUTRAL_ICON}
        icon="calendar-number-outline"
        title={t('settings.financialMonth.startsOn')}
        trailing={<RowValue>{dayLabel(startDay)}</RowValue>}
        onPress={() => setOpen(true)}
      />
      <ListItem
        {...NEUTRAL_ICON}
        icon="time-outline"
        title={t('settings.financialMonth.current', {
          range: `${short(range.start)} – ${short(range.end)}`,
        })}
      />
      <ChoiceSheet
        visible={open}
        title={t('settings.financialMonth.startsOn')}
        choices={choices}
        value={String(startDay)}
        onChange={(value) => updatePreferences({ financialMonthStartDay: Number(value) })}
        onDismiss={() => setOpen(false)}
      />
    </SettingsGroup>
  );
}

function DiscreetRow() {
  const { t } = useTranslation();
  const { preferences, updatePreferences } = usePreferences();
  return (
    <View style={styles.controlRow}>
      <ListItem {...NEUTRAL_ICON} icon="eye-off-outline" title={t('settings.discreet.title')} />
      <View style={styles.control}>
        <SegmentedControl
          accessibilityLabel={t('settings.discreet.title')}
          value={preferences.discreetAmounts ? 'on' : 'off'}
          onChange={(value) => updatePreferences({ discreetAmounts: value === 'on' })}
          options={[
            { value: 'off', label: t('settings.discreet.off') },
            { value: 'on', label: t('settings.discreet.on') },
          ]}
        />
      </View>
    </View>
  );
}

/** Conta proposta num movimento novo: a última usada ou uma conta ativa. */
function DefaultAccountRow() {
  const { t } = useTranslation();
  const { preferences, updatePreferences } = usePreferences();
  const { accounts } = useAccountCurrencies();
  const [open, setOpen] = useState(false);
  const chosen = accounts.find((account) => account.id === preferences.defaultAccountId);
  const choices: Choice<string>[] = [
    { value: 'last', label: t('settings.defaultAccount.last') },
    ...accounts.map((account) => ({
      value: account.id,
      label: account.name,
      hint: account.currency,
    })),
  ];
  return (
    <>
      <ListItem
        {...NEUTRAL_ICON}
        icon="card-outline"
        title={t('settings.defaultAccount.title')}
        trailing={<RowValue>{chosen ? chosen.name : t('settings.defaultAccount.last')}</RowValue>}
        onPress={() => setOpen(true)}
      />
      <ChoiceSheet
        visible={open}
        title={t('settings.defaultAccount.title')}
        choices={choices}
        value={chosen ? chosen.id : 'last'}
        onChange={(defaultAccountId) => updatePreferences({ defaultAccountId })}
        onDismiss={() => setOpen(false)}
      />
    </>
  );
}

function HapticsRow() {
  const { t } = useTranslation();
  const { preferences, updatePreferences } = usePreferences();
  return (
    <View style={styles.controlRow}>
      <ListItem
        {...NEUTRAL_ICON}
        icon="phone-portrait-outline"
        title={t('settings.haptics.title')}
      />
      <View style={styles.control}>
        <SegmentedControl
          accessibilityLabel={t('settings.haptics.title')}
          value={preferences.haptics ? 'on' : 'off'}
          onChange={(value) => updatePreferences({ haptics: value === 'on' })}
          options={[
            { value: 'on', label: t('settings.haptics.on') },
            { value: 'off', label: t('settings.haptics.off') },
          ]}
        />
      </View>
    </View>
  );
}

function AnalyticsRow() {
  const { t } = useTranslation();
  const { preferences, updatePreferences } = usePreferences();
  return (
    <View style={styles.controlRow}>
      <ListItem {...NEUTRAL_ICON} icon="analytics-outline" title={t('settings.analytics.title')} />
      <View style={styles.control}>
        <SegmentedControl
          accessibilityLabel={t('settings.analytics.title')}
          value={preferences.analytics ? 'on' : 'off'}
          onChange={(value) => updatePreferences({ analytics: value === 'on' })}
          options={[
            { value: 'off', label: t('settings.analytics.off') },
            { value: 'on', label: t('settings.analytics.on') },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  themeRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  themeOption: {
    flex: 1,
    minWidth: 0,
    borderWidth: 2,
    borderRadius: radius.lg,
    padding: spacing.sm,
    gap: spacing.sm,
    minHeight: layout.minTouchTarget,
  },
  preview: {
    flexDirection: 'row',
    height: 72,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  previewPane: {
    flex: 1,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  previewLeft: {
    borderTopRightRadius: 0,
  },
  previewRight: {
    borderTopLeftRadius: 0,
  },
  previewBar: {
    height: 6,
    width: '40%',
    borderRadius: radius.full,
  },
  previewCard: {
    flex: 1,
    borderRadius: radius.xs,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  previewLine: {
    height: 4,
    width: '70%',
    borderRadius: radius.full,
  },
  previewLineShort: {
    height: 4,
    width: '45%',
    borderRadius: radius.full,
  },
  themeLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
    minHeight: 24,
  },
  groupNote: {
    marginTop: -spacing.lg,
    paddingHorizontal: spacing.xs,
  },
  controlRow: {
    paddingBottom: spacing.md,
  },
  control: {
    paddingLeft: ROW_DIVIDER_INSET,
    paddingRight: spacing.lg,
  },
});
