import { router, type Href } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import {
  calendarDateToLocalDate,
  currentOdometer,
  vehicleDeadlines,
  vehicleStats,
  type CalendarDate,
  type Vehicle,
  type VehicleDeadline,
} from '@/core/finance';
import { DEFAULT_CURRENCY } from '@/core/money';
import { useDataQuery, useRepositories, type Repositories } from '@/data';
import { useLocaleFormat } from '@/i18n';
import {
  Amount,
  Badge,
  Button,
  Card,
  Dialog,
  Divider,
  EmptyState,
  Icon,
  IconButton,
  ListItem,
  Screen,
  SwipeableRow,
  Text,
} from '@/ui/components';
import { useBreakpoint } from '@/ui/layout/useBreakpoint';
import { radius, spacing, useTheme } from '@/ui/theme';

import { DEADLINE_TONES, deadlineLabel } from '../finance/DeadlineBadge';
import { useToday } from '../finance/useToday';
import { vehicleIcon, vehicleKindLabel } from './presentation';

type VehicleSummary = {
  vehicle: Vehicle;
  odometer: number | null;
  deadlines: VehicleDeadline[];
  currency: string;
  /** Gasto deste ano na moeda do veículo (sem a compra). */
  spentThisYear: number;
};

async function loadSummaries(repositories: Repositories, today: CalendarDate) {
  const vehicles = await repositories.vehicles.list();
  const summaries: VehicleSummary[] = [];
  for (const vehicle of vehicles) {
    const entries = await repositories.entries.listForVehicle(vehicle.id);
    const currency = vehicle.currency ?? entries[0]?.currency ?? DEFAULT_CURRENCY;
    const odometer = currentOdometer(vehicle, entries);
    const stats = vehicleStats(
      vehicle,
      entries.filter((entry) => entry.currency === currency),
      today,
    );
    summaries.push({
      vehicle,
      odometer,
      deadlines: vehicleDeadlines(vehicle, today, odometer),
      currency,
      spentThisYear: stats.spentThisYear,
    });
  }
  return summaries;
}

/**
 * Viaturas: resumo (quantas, quanto custaram este ano por moeda, próximas obrigações com datas)
 * e um cartão por viatura com o estado dos prazos e o gasto do ano. Os valores agregam os
 * movimentos ligados (ADR-054); nada é somado entre moedas diferentes.
 */
export function VehiclesScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const today = useToday();
  const wide = useBreakpoint() !== 'compact';
  const query = useDataQuery(
    useCallback((repositories: Repositories) => loadSummaries(repositories, today), [today]),
  );
  const repositories = useRepositories();
  // Eliminar a partir da lista: pede sempre confirmação, com o número de movimentos ligados.
  const [deleting, setDeleting] = useState<{ vehicle: Vehicle; entries: number } | null>(null);
  const askDelete = async (vehicle: Vehicle) => {
    const links = await repositories.vehicles.countLinks(vehicle.id);
    setDeleting({ vehicle, entries: links.entries });
  };
  const add = () => router.push('/vehicles/new' as Href);
  const header = {
    title: t('nav.vehicles'),
    subtitle: t('vehicles.subtitle'),
    headerRight: wide ? (
      <Button label={t('vehicles.add')} icon="add" onPress={add} />
    ) : (
      <IconButton
        icon="add"
        variant="filled"
        accessibilityLabel={t('vehicles.add')}
        onPress={add}
      />
    ),
  };

  if (!query.data) {
    return (
      <Screen {...header}>
        {query.status === 'error' ? (
          <EmptyState icon="alert-circle-outline" title={t('errors.loadFailed')} />
        ) : (
          <ActivityIndicator
            color={colors.primary}
            style={styles.loading}
            accessibilityLabel={t('common.loading')}
          />
        )}
      </Screen>
    );
  }
  if (query.data.length === 0) {
    return (
      <Screen {...header}>
        <EmptyState
          icon="car-outline"
          title={t('vehicles.emptyTitle')}
          description={t('vehicles.emptyDescription')}>
          <Button label={t('vehicles.start')} onPress={add} />
        </EmptyState>
      </Screen>
    );
  }

  const summaries = query.data;
  return (
    <Screen {...header}>
      <Overview summaries={summaries} wide={wide} />
      <View style={[styles.grid, wide && styles.gridWide]}>
        {summaries.map((summary) => {
          const card = <VehicleCard summary={summary} />;
          return (
            <View key={summary.vehicle.id} style={wide ? styles.cell : undefined}>
              {wide ? (
                card
              ) : (
                <SwipeableRow
                  borderRadius={radius.xl}
                  actions={[
                    {
                      label: t('vehicles.edit'),
                      icon: 'create-outline',
                      onPress: () =>
                        router.push({
                          pathname: '/vehicles/edit/[id]',
                          params: { id: summary.vehicle.id },
                        }),
                    },
                    {
                      label: t('vehicles.delete'),
                      icon: 'trash-outline',
                      tone: 'negative',
                      onPress: () => void askDelete(summary.vehicle),
                    },
                  ]}>
                  {card}
                </SwipeableRow>
              )}
            </View>
          );
        })}
      </View>
      <Dialog
        visible={deleting !== null}
        title={t('vehicles.deleteTitle')}
        message={
          deleting?.entries
            ? t('vehicles.deleteMessage', { count: deleting.entries })
            : t('vehicles.deleteMessageNone')
        }
        onDismiss={() => setDeleting(null)}
        actions={[
          {
            label: t('vehicles.delete'),
            variant: 'destructive',
            onPress: () => {
              const target = deleting;
              setDeleting(null);
              if (target)
                void repositories.vehicles.delete(target.vehicle.id).catch(() => undefined);
            },
          },
          { label: t('common.cancel'), variant: 'ghost', onPress: () => setDeleting(null) },
        ]}
      />
    </Screen>
  );
}

/** Quantas viaturas, gasto do ano (por moeda) e as próximas obrigações de todas. */
function Overview({ summaries, wide }: { summaries: VehicleSummary[]; wide: boolean }) {
  const { t } = useTranslation();
  const byCurrency = new Map<string, number>();
  for (const summary of summaries) {
    byCurrency.set(
      summary.currency,
      (byCurrency.get(summary.currency) ?? 0) + summary.spentThisYear,
    );
  }
  const upcoming = summaries
    .flatMap((summary) =>
      summary.deadlines
        .filter((deadline) => deadline.dueOn !== null || deadline.kmLeft !== null)
        .map((deadline) => ({ summary, deadline })),
    )
    .sort((a, b) => {
      const rank = { overdue: 0, soon: 1, ok: 2 } as const;
      const byStatus = rank[a.deadline.status] - rank[b.deadline.status];
      if (byStatus !== 0) return byStatus;
      return (a.deadline.dueOn ?? '9999') < (b.deadline.dueOn ?? '9999') ? -1 : 1;
    })
    .slice(0, 5);
  const attention = summaries.reduce(
    (count, summary) =>
      count + summary.deadlines.filter((deadline) => deadline.status !== 'ok').length,
    0,
  );

  const totals = (
    <Card padding="lg">
      <View style={styles.stack}>
        <Text variant="footnote" tone="secondary">
          {t('vehicles.overview.vehicles', { count: summaries.length })}
        </Text>
        <View style={styles.stackTight}>
          <Text variant="label" tone="secondary">
            {t('vehicles.overview.spentYear')}
          </Text>
          {[...byCurrency.entries()].map(([currency, amount]) => (
            <Amount key={currency} value={{ amountMinor: amount, currency }} variant="amountHero" />
          ))}
        </View>
        <View style={styles.badge}>
          <Badge
            tone={attention > 0 ? 'warning' : 'positive'}
            label={
              attention > 0
                ? t('vehicles.overview.attention', { count: attention })
                : t('vehicles.overview.allOk')
            }
          />
        </View>
      </View>
    </Card>
  );

  const list = (
    <Card padding="xs" style={wide ? styles.flex2 : undefined}>
      <View style={styles.cardHead}>
        <Text variant="overline" tone="tertiary" accessibilityRole="header">
          {t('vehicles.overview.upcoming')}
        </Text>
      </View>
      {upcoming.length === 0 ? (
        <View style={styles.padded}>
          <Text variant="callout" tone="secondary">
            {t('vehicles.overview.upcomingEmpty')}
          </Text>
        </View>
      ) : (
        upcoming.map(({ summary, deadline }, index) => (
          <View key={`${summary.vehicle.id}-${deadline.kind}`}>
            {index > 0 ? <Divider inset={spacing.lg} /> : null}
            <DeadlineRow summary={summary} deadline={deadline} />
          </View>
        ))
      )}
    </Card>
  );

  return wide ? (
    <View style={styles.overviewWide}>
      <View style={styles.flex1}>{totals}</View>
      {list}
    </View>
  ) : (
    <View style={styles.stack}>
      {totals}
      {list}
    </View>
  );
}

function DeadlineRow({
  summary,
  deadline,
}: {
  summary: VehicleSummary;
  deadline: VehicleDeadline;
}) {
  const { t } = useTranslation();
  const { formatDate, formatNumber } = useLocaleFormat();
  const when = deadline.dueOn
    ? formatDate(calendarDateToLocalDate(deadline.dueOn), 'medium')
    : deadline.dueKm !== null
      ? t('vehicles.km', { value: formatNumber(deadline.dueKm) })
      : '';
  const label =
    deadline.daysLeft !== null
      ? deadlineLabel(t, deadline.daysLeft)
      : deadline.kmLeft !== null && deadline.kmLeft >= 0
        ? t('vehicles.kmLeft', { value: formatNumber(deadline.kmLeft) })
        : t('vehicles.kmOver', { value: formatNumber(-(deadline.kmLeft ?? 0)) });
  return (
    <ListItem
      icon={vehicleIcon(summary.vehicle)}
      iconColor="textSecondary"
      iconBackground="surfaceMuted"
      title={t(`vehicles.deadlineKinds.${deadline.kind}`)}
      subtitle={[summary.vehicle.name, when].filter(Boolean).join(' · ')}
      trailing={<Badge label={label} tone={DEADLINE_TONES[deadline.status]} />}
      onPress={() => router.push(`/vehicles/${summary.vehicle.id}` as Href)}
      showChevron={false}
    />
  );
}

/** Cartão de uma viatura: identificação, quilómetros, estado dos prazos e gasto do ano. */
function VehicleCard({ summary }: { summary: VehicleSummary }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { formatNumber } = useLocaleFormat();
  const { vehicle, deadlines, odometer } = summary;
  const worst = deadlines[0];
  const makeModel = [vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(' ');
  const facts = [
    vehicleKindLabel(t, vehicle),
    vehicle.fuelType ? t(`vehicles.fuelTypes.${vehicle.fuelType}`) : null,
    odometer === null ? null : t('vehicles.km', { value: formatNumber(odometer) }),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Card
      padding="lg"
      onPress={() => router.push(`/vehicles/${vehicle.id}` as Href)}
      accessibilityLabel={[vehicle.name, makeModel, vehicle.plate, facts]
        .filter(Boolean)
        .join(', ')}>
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <View style={[styles.vehicleIcon, { backgroundColor: colors.primaryMuted }]}>
            <Icon name={vehicleIcon(vehicle)} size={26} color="primaryText" />
          </View>
          <View style={styles.cardText}>
            <Text variant="title3" numberOfLines={1}>
              {vehicle.name}
            </Text>
            {makeModel ? (
              <Text variant="footnote" tone="secondary" numberOfLines={1}>
                {makeModel}
              </Text>
            ) : null}
          </View>
          {vehicle.plate ? (
            <View style={[styles.plate, { borderColor: colors.borderStrong }]}>
              <Text variant="caption" tabular>
                {vehicle.plate.toLocaleUpperCase()}
              </Text>
            </View>
          ) : null}
        </View>
        {facts ? (
          <Text variant="footnote" tone="secondary">
            {facts}
          </Text>
        ) : null}
        <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
          <Fact label={t('vehicles.overview.thisYear')}>
            {summary.spentThisYear !== 0 ? (
              <Amount
                value={{ amountMinor: summary.spentThisYear, currency: summary.currency }}
                variant="bodyStrong"
              />
            ) : (
              <Text variant="callout" tone="tertiary">
                {t('vehicles.overview.noCosts')}
              </Text>
            )}
          </Fact>
          {worst ? (
            <Badge
              tone={DEADLINE_TONES[worst.status]}
              label={
                worst.status === 'ok'
                  ? t('vehicles.overview.allOk')
                  : `${t(`vehicles.deadlineKinds.${worst.kind}`)} · ${
                      worst.daysLeft !== null
                        ? deadlineLabel(t, worst.daysLeft)
                        : worst.kmLeft !== null && worst.kmLeft >= 0
                          ? t('vehicles.kmLeft', { value: formatNumber(worst.kmLeft) })
                          : t('vehicles.kmOver', { value: formatNumber(-(worst.kmLeft ?? 0)) })
                    }`
              }
            />
          ) : null}
        </View>
      </View>
    </Card>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.fact}>
      <Text variant="caption" tone="tertiary">
        {label}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { marginTop: spacing.xl },
  stack: { gap: spacing.md },
  stackTight: { gap: spacing.xxs },
  badge: { alignSelf: 'flex-start' },
  overviewWide: { flexDirection: 'row', gap: spacing.lg, alignItems: 'stretch' },
  flex1: { flex: 1 },
  flex2: { flex: 2 },
  cardHead: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xs },
  padded: { padding: spacing.lg },
  grid: { gap: spacing.md },
  gridWide: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  cell: { flexGrow: 1, flexBasis: 340, minWidth: 0 },
  cardBody: { gap: spacing.md },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  vehicleIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: { flex: 1, minWidth: 0, gap: spacing.xxs },
  plate: {
    borderWidth: 1.5,
    borderRadius: radius.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
    flexWrap: 'wrap',
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  fact: { gap: spacing.xxs },
});
