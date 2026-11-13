import { router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useAuth } from '@/features/account/AuthProvider';
import { SyncStatusGroup } from '@/features/account/AccountSettings';
import { Icon, ListItem, Text } from '@/ui/components';
import { spacing } from '@/ui/theme';

import { NEUTRAL_ICON, SettingsGroup, SettingsPageHeader } from './SettingsBlocks';

/**
 * Definições › Dados e sincronização: estado da sincronização (com sessão), cópias de segurança
 * (exportar, restaurar, automáticas) e onde ficam os dados.
 */
export function DataPage() {
  const { t } = useTranslation();
  const signedIn = useAuth().state.status === 'signedIn';

  return (
    <>
      <SettingsPageHeader
        title={t('settings.sections.data.title')}
        description={t('settings.sections.data.description')}
      />

      {signedIn ? <SyncStatusGroup /> : null}

      <SettingsGroup title={t('settings.blocks.backups')} note={t('settings.data.backupsAuto')}>
        <ListItem
          {...NEUTRAL_ICON}
          icon="archive-outline"
          title={t('settings.data.backupsOpen')}
          subtitle={t('settings.data.backupsOpenHint')}
          onPress={() => router.push('/backup' as Href)}
        />
      </SettingsGroup>

      <SettingsGroup title={t('settings.blocks.storage')} plain>
        <View style={styles.facts}>
          <Fact icon="phone-portrait-outline" text={t('settings.data.storageLocal')} />
          {signedIn ? (
            <>
              <Fact icon="server-outline" text={t('settings.data.storageServer')} />
              <Fact icon="git-compare-outline" text={t('settings.data.storageConflicts')} />
            </>
          ) : null}
        </View>
      </SettingsGroup>
    </>
  );
}

/** Uma afirmação curta com ícone: informação, não uma ação. */
function Fact({
  icon,
  text,
}: {
  icon: 'phone-portrait-outline' | 'server-outline' | 'git-compare-outline';
  text: string;
}) {
  return (
    <View style={styles.fact}>
      <Icon name={icon} size={18} color="textSecondary" />
      <Text variant="callout" tone="secondary" style={styles.factText}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  facts: {
    gap: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  fact: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  factText: {
    flex: 1,
  },
});
