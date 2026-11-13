import Constants from 'expo-constants';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { parseBackup, type BackupFile, type RestorePlan } from '@/core/backup';
import { LATEST_SCHEMA_VERSION, useRepositories } from '@/data';
import { useLocaleFormat } from '@/i18n';
import { appStorage } from '@/lib/storage/key-value-store';
import { Button, Card, Dialog, Divider, FormScreen, ListItem, Text } from '@/ui/components';
import { spacing } from '@/ui/theme';

import { closeModal } from '../finance/navigation';
import { useActiveSpace } from '../app-shell/DataGate';
import { backupOwner, runAutoBackup } from './AutoBackup';
import {
  listAutoBackups,
  pickBackupFile,
  readAutoBackup,
  shareFile,
  type StoredBackup,
} from './backup-files';
import { settingsHref } from './settings-sections';

const LAST_EXPORT_KEY = 'backup.lastExportAt';

type Pending = { backup: BackupFile; plan: RestorePlan };

export function BackupScreen() {
  const { t } = useTranslation();
  const { formatDate } = useLocaleFormat();
  const repositories = useRepositories();
  const owner = backupOwner(useActiveSpace().space);
  const [lastExport, setLastExport] = useState<string | null>(null);
  const [autos, setAutos] = useState<StoredBackup[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'positive' | 'negative'; text: string } | null>(
    null,
  );
  const [pending, setPending] = useState<Pending | null>(null);

  const refresh = useCallback(async () => {
    setLastExport(await appStorage.getItem(LAST_EXPORT_KEY).catch(() => null));
    setAutos(await listAutoBackups(owner));
  }, [owner]);
  useEffect(() => {
    let alive = true;
    void (async () => {
      const [stamp, list] = await Promise.all([
        appStorage.getItem(LAST_EXPORT_KEY).catch(() => null),
        listAutoBackups(owner),
      ]);
      if (!alive) return;
      setLastExport(stamp);
      setAutos(list);
    })();
    return () => {
      alive = false;
    };
  }, [owner]);

  const when = (iso: string) => {
    const date = new Date(iso.replace(/-(\d{2})-(\d{2})-(\d{3})Z$/, ':$1:$2.$3Z'));
    return Number.isNaN(date.getTime())
      ? iso
      : `${formatDate(date, 'medium')} ${date.toLocaleTimeString().slice(0, 5)}`;
  };

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    setMessage(null);
    try {
      await task();
    } catch {
      setMessage({ tone: 'negative', text: t('backup.failed') });
    } finally {
      setBusy(false);
    }
  };

  const exportJson = () =>
    run(async () => {
      const backup = await repositories.backup.exportData(Constants.expoConfig?.version ?? '');
      const stamp = backup.createdAt.slice(0, 10);
      await shareFile(
        `miven-copia-${stamp}.json`,
        JSON.stringify(backup, null, 1),
        'application/json',
      );
      await appStorage.setItem(LAST_EXPORT_KEY, backup.createdAt);
      setMessage({ tone: 'positive', text: t('backup.exported') });
      await refresh();
    });

  const exportCsv = () =>
    run(async () => {
      const csv = await repositories.backup.entriesCsv();
      await shareFile(
        `miven-movimentos-${new Date().toISOString().slice(0, 10)}.csv`,
        csv,
        'text/csv',
      );
      setMessage({ tone: 'positive', text: t('backup.exported') });
    });

  /** Verifica o ficheiro e mostra o que mudaria; nada é gravado antes da confirmação. */
  const prepare = (text: string) =>
    run(async () => {
      const checked = parseBackup(text, LATEST_SCHEMA_VERSION);
      if (!checked.ok) {
        setMessage({ tone: 'negative', text: t(`backup.invalid.${checked.reason}`) });
        return;
      }
      const plan = await repositories.backup.planRestore(checked.backup);
      setPending({ backup: checked.backup, plan });
    });

  const restoreFromFile = () =>
    run(async () => {
      const picked = await pickBackupFile();
      if (!picked.ok) {
        if (picked.reason === 'readFailed')
          setMessage({ tone: 'negative', text: t('backup.failed') });
        return;
      }
      await prepare(picked.text);
    });

  const restoreAuto = (item: StoredBackup) =>
    run(async () => {
      const text = await readAutoBackup(owner, item.name);
      if (text) await prepare(text);
      else setMessage({ tone: 'negative', text: t('backup.failed') });
    });

  const confirmRestore = () => {
    const current = pending;
    setPending(null);
    if (!current) return;
    void run(async () => {
      const applied = await repositories.backup.applyRestore(current.backup);
      setMessage({
        tone: 'positive',
        text: t('backup.restored', { inserted: applied.totalInsert, updated: applied.totalUpdate }),
      });
    });
  };

  return (
    <FormScreen
      title={t('backup.title')}
      closeLabel={t('common.close')}
      onClose={() => closeModal(settingsHref('data'))}>
      <View style={styles.body}>
        <Text variant="callout" tone="secondary">
          {t('backup.intro')}
        </Text>
        {message ? (
          <Text variant="footnote" tone={message.tone} accessibilityLiveRegion="polite">
            {message.text}
          </Text>
        ) : null}

        <Card>
          <View style={styles.section}>
            <Text variant="title3">{t('backup.exportTitle')}</Text>
            <Text variant="footnote" tone="tertiary">
              {lastExport
                ? t('backup.lastExport', { date: when(lastExport) })
                : t('backup.neverExported')}
            </Text>
            <Button
              label={t('backup.exportJson')}
              icon="download-outline"
              loading={busy}
              disabled={busy}
              onPress={() => void exportJson()}
            />
            <Button
              label={t('backup.exportCsv')}
              icon="document-text-outline"
              variant="secondary"
              disabled={busy}
              onPress={() => void exportCsv()}
            />
            <Text variant="footnote" tone="tertiary">
              {t('backup.fileWarning')}
            </Text>
          </View>
        </Card>

        <Card>
          <View style={styles.section}>
            <Text variant="title3">{t('backup.restoreTitle')}</Text>
            <Text variant="footnote" tone="tertiary">
              {t('backup.restoreRule')}
            </Text>
            <Button
              label={t('backup.restoreFile')}
              icon="refresh-outline"
              variant="secondary"
              disabled={busy}
              onPress={() => void restoreFromFile()}
            />
          </View>
        </Card>

        <Card padding="xs">
          <View style={styles.autoHeader}>
            <Text variant="title3">{t('backup.autoTitle')}</Text>
            <Text variant="footnote" tone="tertiary">
              {t('backup.autoInfo')}
            </Text>
          </View>
          {autos.length === 0 ? (
            <Text variant="footnote" tone="secondary" style={styles.empty}>
              {t('backup.autoEmpty')}
            </Text>
          ) : (
            autos.map((item, index) => (
              <View key={item.name}>
                {index > 0 ? <Divider /> : null}
                <ListItem
                  icon="time-outline"
                  title={when(item.createdAt)}
                  trailing={
                    <Button
                      label={t('backup.restore')}
                      variant="ghost"
                      disabled={busy}
                      onPress={() => void restoreAuto(item)}
                    />
                  }
                />
              </View>
            ))
          )}
          <View style={styles.autoHeader}>
            <Button
              label={t('backup.autoNow')}
              variant="ghost"
              icon="save-outline"
              disabled={busy}
              onPress={() =>
                void run(async () => {
                  await runAutoBackup(repositories, owner, new Date(), { force: true });
                  await refresh();
                })
              }
            />
          </View>
        </Card>
      </View>

      <Dialog
        visible={pending !== null}
        title={t('backup.confirmTitle')}
        message={
          pending
            ? t('backup.confirmMessage', {
                date: when(pending.backup.createdAt),
                inserted: pending.plan.totalInsert,
                updated: pending.plan.totalUpdate,
                kept: pending.plan.keptNewer,
                deleted: pending.plan.keptDeleted,
              })
            : undefined
        }
        onDismiss={() => setPending(null)}
        actions={[
          {
            label: t('backup.confirm'),
            disabled: !pending || pending.plan.totalInsert + pending.plan.totalUpdate === 0,
            onPress: confirmRestore,
          },
          { label: t('common.cancel'), variant: 'secondary', onPress: () => setPending(null) },
        ]}
      />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.lg },
  section: { gap: spacing.sm },
  autoHeader: { gap: spacing.xs, padding: spacing.md },
  empty: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
});
