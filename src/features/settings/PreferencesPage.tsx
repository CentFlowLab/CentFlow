import { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  usePreferences,
  type LanguagePreference,
  type ThemePreference,
} from '@/features/preferences';
import { LANGUAGE_META, SUPPORTED_LANGUAGES, useLocaleFormat } from '@/i18n';
import { analyticsAvailable } from '@/lib/analytics';
import { Divider, Icon, ListItem, SegmentedControl, Text } from '@/ui/components';
import { colorsByScheme, layout, radius, spacing, useTheme, type ColorScheme } from '@/ui/theme';

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

/** Definições › Preferências: aparência, idioma, formatos, atalhos e privacidade. */
export function PreferencesPage() {
  const { t } = useTranslation();
  const { formatMoney, formatDate, formatPercent } = useLocaleFormat();
  const today = new Date();

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

      {/* Números, moedas e datas seguem a região do aparelho (useLocaleFormat). */}
      <SettingsGroup title={t('settings.blocks.region')} note={t('settings.formatsNote')}>
        <ListItem
          {...NEUTRAL_ICON}
          icon="cash-outline"
          title={t('settings.formatsNumbers')}
          trailing={
            <RowValue>
              {`${formatMoney({ amountMinor: 123456, currency: 'EUR' })} · ${formatPercent(0.25)}`}
            </RowValue>
          }
        />
        <ListItem
          {...NEUTRAL_ICON}
          icon="calendar-outline"
          title={t('settings.formatsDates')}
          trailing={<RowValue>{formatDate(today, 'medium')}</RowValue>}
        />
      </SettingsGroup>

      {quickEntryAvailable() ? (
        <SettingsGroup title={t('settings.blocks.shortcuts')}>
          <QuickEntryRow />
        </SettingsGroup>
      ) : null}

      {analyticsAvailable() ? (
        <SettingsGroup
          title={t('settings.blocks.privacy')}
          note={t('settings.analytics.description')}>
          <AnalyticsRow />
        </SettingsGroup>
      ) : null}
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
  controlRow: {
    paddingBottom: spacing.md,
  },
  control: {
    paddingLeft: ROW_DIVIDER_INSET,
    paddingRight: spacing.lg,
  },
});
