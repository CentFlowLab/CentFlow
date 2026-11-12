import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Fragment, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AccountSettings } from '@/features/account/AccountSection';
import { useLocaleFormat , LANGUAGE_META, SUPPORTED_LANGUAGES } from '@/i18n';
import {
  CONTACT_EMAIL,
  openExternal,
  PRIVACY_URL,
  SUPPORT_URL,
  TERMS_URL,
} from '@/features/account/legal-links';
import {
  usePreferences,
  type LanguagePreference,
  type ThemePreference,
} from '@/features/preferences';
import { analyticsAvailable } from '@/lib/analytics';
import {
  Card,
  Divider,
  FadeIn,
  Icon,
  ListItem,
  Screen,
  Section,
  SegmentedControl,
  Text,
  type IconName,
} from '@/ui/components';
import { spacing } from '@/ui/theme';

import { ListChevron, quickEntryAvailable, QuickEntryRow } from './QuickEntrySection';

const THEME_OPTIONS: readonly ThemePreference[] = ['system', 'light', 'dark'];
const LANGUAGE_OPTIONS: readonly LanguagePreference[] = ['system', ...SUPPORTED_LANGUAGES];

/** Largura de leitura confortável em tablet e desktop (as linhas não esticam até ao fim). */
const SETTINGS_MAX_WIDTH = 680;
/** Recuo dos separadores: alinha com o texto, depois do ícone. */
const DIVIDER_INSET = spacing.lg + 36 + spacing.md;

/** Ícone neutro das linhas: o verde fica para o que está selecionado. */
const NEUTRAL = { iconColor: 'textSecondary', iconBackground: 'surfaceMuted' } as const;

/**
 * Definições: Conta, Sincronização, Aparência, Idioma e região, Dados e privacidade,
 * Experiência, Ajuda e Zona de perigo. Só aparecem opções que já funcionam.
 * Escolhas simples (aparência, idioma) fazem-se aqui, sem abrir outro ecrã.
 */
export function SettingsScreen() {
  const { t } = useTranslation();
  const version = Constants.expoConfig?.version ?? '—';
  const { formatMoney, formatDate } = useLocaleFormat();

  return (
    <Screen title={t('settings.title')}>
      <View style={styles.column}>
        <AccountSettings>
          <Section title={t('settings.groups.appearance')}>
            <Card padding="xs">
              <AppearanceSetting />
            </Card>
          </Section>

          <Section title={t('settings.groups.language')}>
            <Card padding="xs">
              <LanguageSetting />
              <Divider inset={DIVIDER_INSET} />
              {/* Números, moedas e datas seguem a região do aparelho (useLocaleFormat). */}
              <ListItem
                {...NEUTRAL}
                icon="globe-outline"
                title={t('settings.formats')}
                subtitle={t('settings.formatsHint', {
                  example: `${formatMoney({ amountMinor: 123456, currency: 'EUR' })} · ${formatDate(new Date(), 'short')}`,
                })}
              />
            </Card>
          </Section>

          <Section title={t('settings.groups.data')}>
            <Card padding="xs">
              <ListItem
                {...NEUTRAL}
                icon="archive-outline"
                title={t('settings.backup')}
                subtitle={t('settings.backupHint')}
                onPress={() => router.push('/backup')}
              />
              {analyticsAvailable() ? (
                <>
                  <Divider inset={DIVIDER_INSET} />
                  <AnalyticsSetting />
                </>
              ) : null}
            </Card>
          </Section>

          {quickEntryAvailable() ? (
            <Section title={t('settings.groups.experience')}>
              <Card padding="xs">
                <QuickEntryRow />
              </Card>
            </Section>
          ) : null}

          <Section title={t('settings.groups.help')}>
            <Card padding="xs">
              <ListItem
                {...NEUTRAL}
                icon="help-circle-outline"
                title={t('settings.support')}
                showChevron={false}
                trailing={<ExternalMark />}
                onPress={() => openExternal(SUPPORT_URL)}
              />
              <Divider inset={DIVIDER_INSET} />
              <ListItem
                {...NEUTRAL}
                icon="mail-outline"
                title={t('settings.contact')}
                subtitle={CONTACT_EMAIL}
                showChevron={false}
                trailing={<ExternalMark />}
                onPress={() => openExternal(`mailto:${CONTACT_EMAIL}`)}
              />
              <Divider inset={DIVIDER_INSET} />
              <ListItem
                {...NEUTRAL}
                icon="shield-checkmark-outline"
                title={t('settings.privacy')}
                showChevron={false}
                trailing={<ExternalMark />}
                onPress={() => openExternal(PRIVACY_URL)}
              />
              <Divider inset={DIVIDER_INSET} />
              <ListItem
                {...NEUTRAL}
                icon="document-text-outline"
                title={t('settings.terms')}
                showChevron={false}
                trailing={<ExternalMark />}
                onPress={() => openExternal(TERMS_URL)}
              />
              <Divider inset={DIVIDER_INSET} />
              <ListItem
                {...NEUTRAL}
                icon="information-circle-outline"
                title={t('settings.version')}
                trailing={<Value>{version}</Value>}
              />
            </Card>
          </Section>
        </AccountSettings>
      </View>
    </Screen>
  );
}

/** Valor atual à direita de uma linha. */
function Value({ children }: { children: ReactNode }) {
  return (
    <Text variant="callout" tone="secondary" tabular numberOfLines={1}>
      {children}
    </Text>
  );
}

/** Abre fora da app (browser ou email). */
function ExternalMark() {
  return <Icon name="open-outline" size={16} color="textTertiary" />;
}

/** Linha com título e um controlo por baixo (ex.: aparência). */
function ControlRow({
  icon,
  title,
  children,
  footer,
}: {
  icon: IconName;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <View style={styles.controlRow}>
      <ListItem {...NEUTRAL} icon={icon} title={title} />
      <View style={styles.control}>
        {children}
        {footer}
      </View>
    </View>
  );
}

function AppearanceSetting() {
  const { t } = useTranslation();
  const { preferences, updatePreferences } = usePreferences();
  return (
    <ControlRow icon="contrast-outline" title={t('settings.appearance')}>
      <SegmentedControl
        accessibilityLabel={t('settings.appearance')}
        value={preferences.theme}
        onChange={(theme) => updatePreferences({ theme })}
        options={THEME_OPTIONS.map((value) => ({ value, label: t(`settings.theme.${value}`) }))}
      />
    </ControlRow>
  );
}

/** Idioma: mostra o atual; tocar abre as opções no próprio cartão. */
function LanguageSetting() {
  const { t } = useTranslation();
  const { preferences, updatePreferences } = usePreferences();
  const [open, setOpen] = useState(false);
  const label = (language: LanguagePreference) =>
    language === 'system' ? t('settings.languageSystem') : LANGUAGE_META[language].nativeName;

  return (
    <>
      <ListItem
        {...NEUTRAL}
        icon="language-outline"
        title={t('settings.language')}
        expanded={open}
        showChevron={false}
        trailing={
          <View style={styles.valueWithChevron}>
            <Value>{label(preferences.language)}</Value>
            <ListChevron open={open} />
          </View>
        }
        onPress={() => setOpen((value) => !value)}
      />
      {open ? (
        <FadeIn>
          <View accessibilityRole="radiogroup" accessibilityLabel={t('settings.language')}>
            {LANGUAGE_OPTIONS.map((language, index) => {
              const selected = preferences.language === language;
              return (
                <Fragment key={language}>
                  {index > 0 ? <Divider inset={DIVIDER_INSET} /> : null}
                  <ListItem
                    leading={<View style={styles.optionIndent} />}
                    title={label(language)}
                    selected={selected}
                    showChevron={false}
                    trailing={
                      selected ? <Icon name="checkmark" size={20} color="primaryText" /> : null
                    }
                    onPress={() => {
                      updatePreferences({ language });
                      setOpen(false);
                    }}
                  />
                </Fragment>
              );
            })}
          </View>
        </FadeIn>
      ) : null}
    </>
  );
}

function AnalyticsSetting() {
  const { t } = useTranslation();
  const { preferences, updatePreferences } = usePreferences();
  return (
    <ControlRow
      icon="analytics-outline"
      title={t('settings.analytics.title')}
      footer={
        <Text variant="footnote" tone="tertiary">
          {t('settings.analytics.description')}
        </Text>
      }>
      <SegmentedControl
        accessibilityLabel={t('settings.analytics.title')}
        value={preferences.analytics ? 'on' : 'off'}
        onChange={(value) => updatePreferences({ analytics: value === 'on' })}
        options={[
          { value: 'off', label: t('settings.analytics.off') },
          { value: 'on', label: t('settings.analytics.on') },
        ]}
      />
    </ControlRow>
  );
}

const styles = StyleSheet.create({
  column: {
    width: '100%',
    maxWidth: SETTINGS_MAX_WIDTH,
    // Alinhada com o título do ecrã, como as restantes áreas da Miven.
    alignSelf: 'flex-start',
    gap: spacing['2xl'],
  },
  controlRow: {
    paddingBottom: spacing.md,
  },
  control: {
    gap: spacing.sm,
    paddingLeft: DIVIDER_INSET,
    paddingRight: spacing.lg,
  },
  valueWithChevron: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    maxWidth: 180,
  },
  optionIndent: {
    width: 36,
  },
});
