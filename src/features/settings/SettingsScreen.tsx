import Constants from 'expo-constants';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { AccountSection } from '@/features/account/AccountSection';
import {
  CONTACT_EMAIL,
  openExternal,
  PRIVACY_URL,
  TERMS_URL,
} from '@/features/account/legal-links';
import {
  usePreferences,
  type LanguagePreference,
  type ThemePreference,
} from '@/features/preferences';
import { LANGUAGE_META, SUPPORTED_LANGUAGES } from '@/i18n';
import { analyticsAvailable } from '@/lib/analytics';
import {
  Card,
  Divider,
  Icon,
  ListItem,
  Screen,
  Section,
  SegmentedControl,
  Text,
} from '@/ui/components';
import { spacing } from '@/ui/theme';

import { QuickEntrySection } from './QuickEntrySection';

const THEME_OPTIONS: readonly ThemePreference[] = ['system', 'light', 'dark'];
const LANGUAGE_OPTIONS: readonly LanguagePreference[] = ['system', ...SUPPORTED_LANGUAGES];

export function SettingsScreen() {
  const { t } = useTranslation();
  const { preferences, updatePreferences } = usePreferences();
  const version = Constants.expoConfig?.version ?? '—';

  return (
    <Screen title={t('settings.title')}>
      <AccountSection />

      <Section title={t('settings.appearance')}>
        <Card padding="md">
          <SegmentedControl
            accessibilityLabel={t('settings.appearance')}
            value={preferences.theme}
            onChange={(theme) => updatePreferences({ theme })}
            options={THEME_OPTIONS.map((value) => ({ value, label: t(`settings.theme.${value}`) }))}
          />
        </Card>
      </Section>

      {analyticsAvailable() ? (
        <Section title={t('settings.analytics.title')}>
          <Card padding="md" style={styles.analytics}>
            <SegmentedControl
              accessibilityLabel={t('settings.analytics.title')}
              value={preferences.analytics ? 'on' : 'off'}
              onChange={(value) => updatePreferences({ analytics: value === 'on' })}
              options={[
                { value: 'off', label: t('settings.analytics.off') },
                { value: 'on', label: t('settings.analytics.on') },
              ]}
            />
            <Text variant="footnote" tone="secondary">
              {t('settings.analytics.description')}
            </Text>
          </Card>
        </Section>
      ) : null}

      <QuickEntrySection />

      <Section title={t('settings.language')}>
        <Card padding="xs" accessibilityRole="radiogroup">
          {LANGUAGE_OPTIONS.map((language, index) => {
            const selected = preferences.language === language;
            return (
              <Fragment key={language}>
                {index > 0 ? <Divider inset={spacing.lg} /> : null}
                <ListItem
                  title={
                    language === 'system'
                      ? t('settings.languageSystem')
                      : LANGUAGE_META[language].nativeName
                  }
                  selected={selected}
                  showChevron={false}
                  trailing={
                    selected ? <Icon name="checkmark" size={20} color="primaryText" /> : null
                  }
                  onPress={() => updatePreferences({ language })}
                />
              </Fragment>
            );
          })}
        </Card>
      </Section>

      <Section title={t('settings.about')}>
        <Card padding="xs">
          <ListItem
            icon="shield-checkmark-outline"
            title={t('settings.privacy')}
            onPress={() => openExternal(PRIVACY_URL)}
          />
          <Divider inset={spacing.lg} />
          <ListItem
            icon="document-text-outline"
            title={t('settings.terms')}
            onPress={() => openExternal(TERMS_URL)}
          />
          <Divider inset={spacing.lg} />
          <ListItem
            icon="mail-outline"
            title={t('settings.contact')}
            subtitle={CONTACT_EMAIL}
            onPress={() => openExternal(`mailto:${CONTACT_EMAIL}`)}
          />
          <Divider inset={spacing.lg} />
          <ListItem
            title={t('settings.version')}
            trailing={
              <Text variant="callout" tone="secondary" tabular>
                {version}
              </Text>
            }
          />
        </Card>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  analytics: { gap: spacing.md },
});
