import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, View } from 'react-native';

import {
  CONTACT_EMAIL,
  openExternal,
  PRIVACY_URL,
  SUPPORT_URL,
  TERMS_URL,
} from '@/features/account/legal-links';
import { BrandMark, ListItem, Text } from '@/ui/components';
import { spacing } from '@/ui/theme';

import {
  ExternalMark,
  NEUTRAL_ICON,
  RowValue,
  SettingsGroup,
  SettingsPageHeader,
} from './SettingsBlocks';

/** Temas da página de suporte com âncora própria em miven.pt/suporte. */
const HELP_TOPICS = [
  { key: 'install', anchor: 'instalar', icon: 'download-outline' },
  { key: 'banks', anchor: 'bancos', icon: 'business-outline' },
  { key: 'delete', anchor: 'eliminar', icon: 'person-remove-outline' },
] as const;

/** Definições › Ajuda e suporte: centro de ajuda, temas comuns e contacto. */
export function HelpPage() {
  const { t } = useTranslation();
  return (
    <>
      <SettingsPageHeader
        title={t('settings.sections.help.title')}
        description={t('settings.sections.help.description')}
      />
      <SettingsGroup>
        <ListItem
          icon="help-buoy-outline"
          title={t('settings.helpPage.center')}
          subtitle={t('settings.helpPage.centerHint')}
          showChevron={false}
          trailing={<ExternalMark />}
          onPress={() => openExternal(SUPPORT_URL)}
        />
      </SettingsGroup>
      <SettingsGroup title={t('settings.blocks.topics')}>
        {HELP_TOPICS.map((topic) => (
          <ListItem
            key={topic.key}
            {...NEUTRAL_ICON}
            icon={topic.icon}
            title={t(`settings.helpPage.topics.${topic.key}`)}
            showChevron={false}
            trailing={<ExternalMark />}
            onPress={() => openExternal(`${SUPPORT_URL}#${topic.anchor}`)}
          />
        ))}
      </SettingsGroup>
      <SettingsGroup title={t('settings.blocks.contact')} note={t('settings.helpPage.contactHint')}>
        <ListItem
          {...NEUTRAL_ICON}
          icon="mail-outline"
          title={t('settings.contact')}
          subtitle={CONTACT_EMAIL}
          showChevron={false}
          trailing={<ExternalMark />}
          onPress={() => openExternal(`mailto:${CONTACT_EMAIL}`)}
        />
      </SettingsGroup>
    </>
  );
}

/** Número da compilação instalada, quando a app nativa o tem (na web não há). */
function buildNumber(): string | null {
  const config = Constants.expoConfig;
  if (Platform.OS === 'android') return config?.android?.versionCode?.toString() ?? null;
  if (Platform.OS === 'ios') return config?.ios?.buildNumber ?? null;
  return null;
}

/** Definições › Sobre a Miven: versão instalada e informação legal. */
export function AboutPage() {
  const { t } = useTranslation();
  const version = Constants.expoConfig?.version ?? '—';
  const build = buildNumber();
  const platform = Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'web';

  return (
    <>
      <SettingsPageHeader
        title={t('settings.sections.about.title')}
        description={t('settings.sections.about.description')}
      />
      <View style={styles.identity}>
        <BrandMark size={56} />
        <View style={styles.identityText}>
          <Text variant="title3">{t('app.name')}</Text>
          <Text variant="footnote" tone="secondary">
            {`${t('settings.aboutPage.tagline')} · ${t('settings.aboutPage.phase')}`}
          </Text>
        </View>
      </View>
      <SettingsGroup title={t('settings.blocks.app')}>
        <ListItem
          {...NEUTRAL_ICON}
          icon="information-circle-outline"
          title={t('settings.version')}
          trailing={<RowValue>{version}</RowValue>}
        />
        {build ? (
          <ListItem
            {...NEUTRAL_ICON}
            icon="construct-outline"
            title={t('settings.aboutPage.build')}
            trailing={<RowValue>{build}</RowValue>}
          />
        ) : null}
        <ListItem
          {...NEUTRAL_ICON}
          icon={platform === 'web' ? 'globe-outline' : 'phone-portrait-outline'}
          title={t('settings.aboutPage.platform')}
          trailing={<RowValue>{t(`settings.aboutPage.platforms.${platform}`)}</RowValue>}
        />
      </SettingsGroup>
      <SettingsGroup title={t('settings.blocks.legal')}>
        <ListItem
          {...NEUTRAL_ICON}
          icon="shield-checkmark-outline"
          title={t('settings.privacy')}
          showChevron={false}
          trailing={<ExternalMark />}
          onPress={() => openExternal(PRIVACY_URL)}
        />
        <ListItem
          {...NEUTRAL_ICON}
          icon="document-text-outline"
          title={t('settings.terms')}
          showChevron={false}
          trailing={<ExternalMark />}
          onPress={() => openExternal(TERMS_URL)}
        />
      </SettingsGroup>
    </>
  );
}

const styles = StyleSheet.create({
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  identityText: {
    gap: spacing.xxs,
  },
});
