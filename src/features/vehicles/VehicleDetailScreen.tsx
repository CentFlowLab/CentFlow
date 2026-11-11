import { router, useLocalSearchParams } from 'expo-router';
import { Fragment, useCallback, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import {
  calendarDateToLocalDate,
  currentOdometer,
  vehicleDeadlines,
  vehicleStats,
  VEHICLE_COST_TYPES,
  type Vehicle,
  type VehicleDeadline,
} from '@/core/finance';
import { DEFAULT_CURRENCY } from '@/core/money';
import { useDataQuery, type Repositories } from '@/data';
import { useLocaleFormat } from '@/i18n';
import {
  Amount,
  Badge,
  Button,
  Card,
  Divider,
  EmptyState,
  FormScreen,
  ListItem,
  Section,
  Text,
} from '@/ui/components';
import { spacing } from '@/ui/theme';

import { DEADLINE_TONES, deadlineLabel } from '../finance/DeadlineBadge';
import { EntryListItem } from '../finance/EntryListItem';
import { closeModal } from '../finance/navigation';
import { useFinanceLookups } from '../finance/useFinanceLookups';
import { useToday } from '../finance/useToday';
import { vehicleKindLabel } from './presentation';

async function loadVehicle(repositories: Repositories, id: string) {
  const [vehicle, entries, documents] = [
    await repositories.vehicles.get(id),
    await repositories.entries.listForVehicle(id),
    await repositories.documents.list(),
  ];
  return {
    vehicle,
    entries,
    documents: documents.filter((document) => document.vehicleId === id),
  };
}

/** Ficha do veículo (`/vehicles/[id]`): prazos, gastos, combustível, custo por km e histórico. */
export function VehicleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const query = useDataQuery(
    useCallback((repositories: Repositories) => loadVehicle(repositories, id), [id]),
  );
  const lookups = useFinanceLookups();
  const close = () => closeModal('/vehicles');

  if (!query.data || !lookups.data) {
    return (
      <FormScreen title={t('vehicles.detailTitle')} closeLabel={t('common.close')} onClose={close}>
        <ActivityIndicator />
      </FormScreen>
    );
  }
  const { vehicle, entries, documents } = query.data;
  if (!vehicle) {
    return (
      <FormScreen title={t('vehicles.detailTitle')} closeLabel={t('common.close')} onClose={close}>
        <EmptyState icon="search-outline" title={t('vehicles.notFoundTitle')} />
      </FormScreen>
    );
  }
  return (
    <VehicleSheet
      vehicle={vehicle}
      entries={entries}
      documents={documents}
      lookups={lookups.data}
      onClose={close}
    />
  );
}

type Loaded = Awaited<ReturnType<typeof loadVehicle>>;

function VehicleSheet({
  vehicle,
  entries,
  documents,
  lookups,
  onClose,
}: {
  vehicle: Vehicle;
  entries: Loaded['entries'];
  documents: Loaded['documents'];
  lookups: NonNullable<ReturnType<typeof useFinanceLookups>['data']>;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { formatDate, formatMoney, formatNumber, formatDecimal, formatUnitPrice } =
    useLocaleFormat();
  const today = useToday();

  // Totais só numa moeda: a do veículo, ou a mais usada nos movimentos.
  const currency = vehicle.currency ?? entries[0]?.currency ?? DEFAULT_CURRENCY;
  const inCurrency = entries.filter((entry) => entry.currency === currency);
  const stats = vehicleStats(vehicle, inCurrency, today);
  const odometer = currentOdometer(vehicle, entries);
  const deadlines = vehicleDeadlines(vehicle, today, odometer);
  const money = (amountMinor: number) => ({ amountMinor, currency });
  const day = (value: string) => formatDate(calendarDateToLocalDate(value), 'medium');

  const subtitle = [
    vehicleKindLabel(t, vehicle),
    vehicle.plate,
    [vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(' ') || null,
    vehicle.fuelType ? t(`vehicles.fuelTypes.${vehicle.fuelType}`) : null,
    odometer === null ? null : t('vehicles.km', { value: formatNumber(odometer) }),
  ]
    .filter(Boolean)
    .join(' · ');

  const deadlineDetail = (deadline: VehicleDeadline) => {
    const parts: string[] = [];
    if (deadline.dueOn) parts.push(day(deadline.dueOn));
    if (deadline.dueKm !== null)
      parts.push(t('vehicles.km', { value: formatNumber(deadline.dueKm) }));
    return parts.join(' · ');
  };
  // Com data, os dias; só com quilómetros (revisão), os km que faltam.
  const deadlineBadge = (deadline: VehicleDeadline) => {
    if (deadline.daysLeft !== null) return deadlineLabel(t, deadline.daysLeft);
    if (deadline.kmLeft === null) return '';
    return deadline.kmLeft >= 0
      ? t('vehicles.kmLeft', { value: formatNumber(deadline.kmLeft) })
      : t('vehicles.kmOver', { value: formatNumber(-deadline.kmLeft) });
  };

  const byType = VEHICLE_COST_TYPES.filter((type) => stats.byType[type] !== undefined).sort(
    (a, b) => (stats.byType[b] ?? 0) - (stats.byType[a] ?? 0),
  );

  return (
    <FormScreen
      title={vehicle.name}
      closeLabel={t('common.close')}
      onClose={onClose}
      headerRight={
        <Button
          label={t('vehicles.edit')}
          variant="ghost"
          size="sm"
          onPress={() =>
            router.push({ pathname: '/vehicles/edit/[id]', params: { id: vehicle.id } })
          }
        />
      }
      footer={
        <View style={styles.actions}>
          <View style={styles.flex}>
            <Button
              label={t('vehicles.link')}
              variant="secondary"
              icon="link-outline"
              fullWidth
              onPress={() =>
                router.push({ pathname: '/vehicles/link/[id]', params: { id: vehicle.id } })
              }
            />
          </View>
          <View style={styles.flex}>
            <Button
              label={t('vehicles.addExpense')}
              icon="add"
              fullWidth
              onPress={() =>
                router.push({ pathname: '/new-transaction', params: { vehicleId: vehicle.id } })
              }
            />
          </View>
        </View>
      }>
      {subtitle ? (
        <Text variant="callout" tone="secondary">
          {subtitle}
        </Text>
      ) : null}

      <Section title={t('vehicles.deadlines')}>
        <Card padding="xs">
          {deadlines.length === 0 ? (
            <View style={styles.padded}>
              <Text variant="footnote" tone="secondary">
                {t('vehicles.noDeadlines')}
              </Text>
            </View>
          ) : (
            deadlines.map((deadline, index) => (
              <Fragment key={deadline.kind}>
                {index > 0 ? <Divider /> : null}
                <ListItem
                  title={t(`vehicles.deadlineKinds.${deadline.kind}`)}
                  subtitle={deadlineDetail(deadline)}
                  showChevron={false}
                  trailing={
                    <Badge label={deadlineBadge(deadline)} tone={DEADLINE_TONES[deadline.status]} />
                  }
                />
              </Fragment>
            ))
          )}
        </Card>
      </Section>

      <Section title={t('vehicles.spending')}>
        <Card padding="md" style={styles.gap}>
          <View style={styles.row}>
            <Figure label={t('vehicles.thisMonth')}>
              <Amount value={money(stats.spentThisMonth)} variant="bodyStrong" />
            </Figure>
            <Figure label={t('vehicles.thisYear')}>
              <Amount value={money(stats.spentThisYear)} variant="bodyStrong" />
            </Figure>
            <Figure label={t('vehicles.total')}>
              <Amount value={money(stats.spent)} variant="bodyStrong" />
            </Figure>
          </View>
          <Divider />
          <Figure label={t('vehicles.ownership')}>
            <Amount value={money(stats.ownershipCost)} />
          </Figure>
          <Text variant="footnote" tone="tertiary">
            {stats.purchase
              ? t(
                  stats.purchase.source === 'entry'
                    ? 'vehicles.purchaseEntry'
                    : 'vehicles.purchaseInformative',
                  { amount: formatMoney(money(stats.purchase.amount)) },
                )
              : t('vehicles.noPurchase')}
          </Text>
          {inCurrency.length !== entries.length ? (
            <Text variant="footnote" tone="tertiary">
              {t('vehicles.otherCurrency')}
            </Text>
          ) : null}
        </Card>
      </Section>

      {byType.length > 0 ? (
        <Section title={t('vehicles.byType')}>
          <Card padding="xs">
            {byType.map((type, index) => (
              <Fragment key={type}>
                {index > 0 ? <Divider /> : null}
                <ListItem
                  title={t(`vehicles.costTypes.${type}`)}
                  showChevron={false}
                  trailing={<Amount value={money(stats.byType[type] ?? 0)} variant="label" />}
                />
              </Fragment>
            ))}
          </Card>
        </Section>
      ) : null}

      <Section title={t('vehicles.costPerKm')}>
        <Card padding="md" style={styles.gap}>
          {stats.fuel.fills > 0 ? (
            <Text variant="callout">
              {t('vehicles.fuelSummary', {
                litres: formatDecimal(stats.fuel.quantityMilli / 1000, 1),
                count: stats.fuel.fills,
              })}
              {stats.fuel.pricePerLitre !== null
                ? ` · ${t('vehicles.avgPrice', {
                    price: formatUnitPrice(stats.fuel.pricePerLitre, currency),
                  })}`
                : ''}
            </Text>
          ) : null}
          {stats.costPerKm ? (
            <>
              <View style={styles.row}>
                {stats.costPerKm.fuelPerKm !== null ? (
                  <Figure label={t('vehicles.fuelPerKm')}>
                    <Text variant="bodyStrong" tabular>
                      {t('vehicles.perKm', {
                        value: formatUnitPrice(stats.costPerKm.fuelPerKm, currency),
                      })}
                    </Text>
                  </Figure>
                ) : null}
                <Figure label={t('vehicles.totalPerKm')}>
                  <Text variant="bodyStrong" tabular>
                    {t('vehicles.perKm', {
                      value: formatUnitPrice(stats.costPerKm.totalPerKm, currency),
                    })}
                  </Text>
                </Figure>
              </View>
              <Text variant="footnote" tone="tertiary">
                {t('vehicles.kmRange', {
                  from: formatNumber(stats.costPerKm.fromKm),
                  to: formatNumber(stats.costPerKm.toKm),
                })}
              </Text>
            </>
          ) : (
            <Text variant="footnote" tone="secondary">
              {t('vehicles.needMoreData')}
            </Text>
          )}
        </Card>
      </Section>

      {documents.length > 0 ? (
        <Section title={t('vehicles.documents')}>
          <Card padding="xs">
            {documents.map((document, index) => (
              <Fragment key={document.id}>
                {index > 0 ? <Divider /> : null}
                <ListItem
                  icon="document-text-outline"
                  title={document.title}
                  subtitle={document.expiresOn ? day(document.expiresOn) : undefined}
                  onPress={() =>
                    router.push({ pathname: '/documents/[id]', params: { id: document.id } })
                  }
                />
              </Fragment>
            ))}
          </Card>
        </Section>
      ) : null}

      <Section title={t('vehicles.history')}>
        <Card padding="xs">
          {entries.length === 0 ? (
            <View style={styles.padded}>
              <Text variant="footnote" tone="secondary">
                {t('vehicles.noEntries')}
              </Text>
            </View>
          ) : (
            entries.map((entry, index) => (
              <Fragment key={entry.id}>
                {index > 0 ? <Divider /> : null}
                <EntryListItem
                  entry={entry}
                  lookups={lookups}
                  onPress={() => router.push({ pathname: '/entry/[id]', params: { id: entry.id } })}
                />
              </Fragment>
            ))
          )}
        </Card>
      </Section>
    </FormScreen>
  );
}

function Figure({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.figure}>
      <Text variant="footnote" tone="secondary">
        {label}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
  padded: { padding: spacing.md },
  gap: { gap: spacing.md },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  figure: { gap: spacing.xs, minWidth: 96 },
});
