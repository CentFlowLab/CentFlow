import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { calendarDateToLocalDate, isValidCalendarDate } from '@/core/finance';
import {
  REJECTION_CODES,
  type ConflictResolution,
  type RejectionCode,
  type SyncConflict,
} from '@/data';
import { useLocaleFormat } from '@/i18n';
import { Badge, Button, Card, EmptyState, FormScreen, Text } from '@/ui/components';
import { radius, spacing, useTheme } from '@/ui/theme';

import { closeModal } from '../finance/navigation';
import { useFinanceLookups } from '../finance/useFinanceLookups';
import { useSync } from './SyncProvider';

type Version = SyncConflict['local'];

function rejection(detail: string | null): RejectionCode {
  return REJECTION_CODES.find((code) => code === detail) ?? 'invalid';
}

/** Descrição curta de uma versão de um registo, para comparar os dois lados. */
function useDescribe() {
  const { t } = useTranslation();
  const { formatMoney, formatDate } = useLocaleFormat();
  const lookups = useFinanceLookups().data;

  return (conflict: SyncConflict, version: Version): { title: string; detail?: string } => {
    if (!version) return { title: t('conflicts.notOnAccount') };
    if (version.deleted_at !== null) return { title: t('conflicts.deleted') };
    if (conflict.entity === 'accounts' || conflict.entity === 'categories') {
      return { title: String(version.name ?? '') };
    }
    if (conflict.entity === 'goals') {
      const amount =
        typeof version.target_amount === 'number' && typeof version.currency === 'string'
          ? formatMoney({ amountMinor: version.target_amount, currency: version.currency })
          : null;
      return {
        title: String(version.name || t('conflicts.entities.goals')),
        detail: amount ?? undefined,
      };
    }
    if (conflict.entity === 'goal_contributions') {
      return {
        title: t('conflicts.entities.goal_contributions'),
        detail: typeof version.date === 'string' ? version.date : undefined,
      };
    }
    if (conflict.entity === 'wealth_items') {
      const amount =
        typeof version.amount === 'number' && typeof version.currency === 'string'
          ? formatMoney({ amountMinor: version.amount, currency: version.currency })
          : null;
      return {
        title: String(version.name || t('conflicts.entities.wealth_items')),
        detail: amount ?? undefined,
      };
    }
    if (conflict.entity === 'subscriptions') {
      const amount =
        typeof version.amount === 'number' && typeof version.currency === 'string'
          ? formatMoney({ amountMinor: version.amount, currency: version.currency })
          : null;
      return {
        title: String(version.name || t('conflicts.entities.subscriptions')),
        detail: amount ?? undefined,
      };
    }
    if (conflict.entity === 'budgets') {
      const category = lookups?.categories.get(String(version.category_id));
      const amount =
        typeof version.amount === 'number' && typeof version.currency === 'string'
          ? formatMoney({ amountMinor: version.amount, currency: version.currency })
          : null;
      return {
        title: category?.name ?? t('conflicts.entities.budgets'),
        detail: amount ?? undefined,
      };
    }
    const account = lookups?.accounts.get(String(version.account_id));
    const category = lookups?.categories.get(String(version.category_id));
    const amount =
      account && typeof version.amount === 'number'
        ? formatMoney({ amountMinor: version.amount, currency: account.currency })
        : null;
    const date =
      typeof version.date === 'string' && isValidCalendarDate(version.date)
        ? formatDate(calendarDateToLocalDate(version.date))
        : null;
    return {
      title: String(version.description || category?.name || t('conflicts.entities.entries')),
      detail: [amount, date].filter(Boolean).join(' · ') || undefined,
    };
  };
}

function Side({ label, title, detail }: { label: string; title: string; detail?: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.side, { borderColor: colors.border }]}>
      <Text variant="caption" tone="secondary">
        {label}
      </Text>
      <Text variant="bodyStrong">{title}</Text>
      {detail ? (
        <Text variant="footnote" tone="secondary" tabular>
          {detail}
        </Text>
      ) : null}
    </View>
  );
}

function ConflictCard({
  conflict,
  onResolve,
}: {
  conflict: SyncConflict;
  onResolve: (resolution: ConflictResolution) => Promise<void>;
}) {
  const { t } = useTranslation();
  const describe = useDescribe();
  const [busy, setBusy] = useState<ConflictResolution | null>(null);
  const local = describe(conflict, conflict.local);
  const resolve = async (resolution: ConflictResolution) => {
    setBusy(resolution);
    await onResolve(resolution);
    setBusy(null);
  };

  return (
    <Card padding="lg">
      <View style={styles.card}>
        <View style={styles.heading}>
          <Text variant="title3">{t(`conflicts.entities.${conflict.entity}`)}</Text>
          <Badge label={t(`conflicts.reasons.${conflict.reason}`)} tone="warning" />
        </View>
        {conflict.reason === 'rejected' ? (
          <>
            <Text variant="callout" tone="secondary">
              {t(`conflicts.rejectedCodes.${rejection(conflict.detail)}`)}
            </Text>
            <Side label={t('conflicts.thisDevice')} {...local} />
            <Button
              label={t('conflicts.discard')}
              variant="destructive"
              loading={busy === 'keepServer'}
              onPress={() => resolve('keepServer')}
            />
          </>
        ) : (
          <>
            <View style={styles.sides}>
              <Side label={t('conflicts.thisDevice')} {...local} />
              <Side label={t('conflicts.onAccount')} {...describe(conflict, conflict.server)} />
            </View>
            <Button
              label={t('conflicts.keepLocal')}
              loading={busy === 'keepLocal'}
              onPress={() => resolve('keepLocal')}
            />
            <Button
              label={t('conflicts.keepServer')}
              variant="secondary"
              loading={busy === 'keepServer'}
              onPress={() => resolve('keepServer')}
            />
          </>
        )}
      </View>
    </Card>
  );
}

/** `/sync/conflicts` — nenhuma versão é descartada sem decisão do utilizador. */
export function ConflictsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { engine, snapshot, syncNow } = useSync();
  const [conflicts, setConflicts] = useState<SyncConflict[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    if (!engine) return [];
    const list = await engine.listConflicts();
    setConflicts(list);
    return list;
  }, [engine]);

  useEffect(() => {
    if (!engine) return;
    let active = true;
    void engine.listConflicts().then((list) => {
      if (active) setConflicts(list);
    });
    return () => {
      active = false;
    };
  }, [engine, snapshot]);

  const resolve = async (conflict: SyncConflict, resolution: ConflictResolution) => {
    if (!engine) return;
    try {
      setFailed(false);
      await engine.resolveConflict(conflict.id, resolution);
      await load();
      void syncNow();
    } catch {
      setFailed(true);
    }
  };

  return (
    <FormScreen
      title={t('conflicts.title')}
      closeLabel={t('common.close')}
      onClose={() => closeModal('/settings')}>
      {conflicts === null ? (
        <ActivityIndicator color={colors.primary} accessibilityLabel={t('common.loading')} />
      ) : conflicts.length === 0 ? (
        <EmptyState icon="checkmark-circle-outline" title={t('conflicts.empty')} />
      ) : (
        <>
          <Text variant="callout" tone="secondary">
            {t('conflicts.intro')}
          </Text>
          {failed ? (
            <Text variant="callout" tone="negative" accessibilityLiveRegion="polite">
              {t('conflicts.resolveFailed')}
            </Text>
          ) : null}
          {conflicts.map((conflict) => (
            <ConflictCard
              key={conflict.id}
              conflict={conflict}
              onResolve={(resolution) => resolve(conflict, resolution)}
            />
          ))}
        </>
      )}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  sides: {
    gap: spacing.sm,
  },
  side: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xxs,
  },
});
