import Constants from 'expo-constants';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';

import {
  usePreferences,
  type LanguagePreference,
  type ThemePreference,
} from '@/features/preferences';
import { LANGUAGE_META, SUPPORTED_LANGUAGES } from '@/i18n';
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

const THEME_OPTIONS: readonly ThemePreference[] = ['system', 'light', 'dark'];
const LANGUAGE_OPTIONS: readonly LanguagePreference[] = ['system', ...SUPPORTED_LANGUAGES];

export function SettingsScreen() {
  const { t } = useTranslation();
  const { preferences, updatePreferences } = usePreferences();
  const version = Constants.expoConfig?.version ?? '—';

  return (
    <Screen title={t('settings.title')}>
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
