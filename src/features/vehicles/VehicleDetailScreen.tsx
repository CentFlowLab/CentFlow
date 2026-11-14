import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import {
  calendarDateToLocalDate,
  currentOdometer,
  daysUntil,
  deadlineStatus,
  entriesInPeriod,
  externalCostEntries,
  monthKeyToLocalDate,
  SERVICE_SOON_KM,
  VEHICLE_COST_TYPES,
  VEHICLE_PERIODS,
  vehicleMonthlyCosts,
  vehicleCostShares,
  vehicleStats,
  vehicleYearCost,
  type CalendarDate,
  type Vehicle,
  type VehicleCostType,
  type VehicleEntry,
  type VehicleExternalCost,
  type VehiclePeriod,
} from '@/core/finance';
import { DEFAULT_CURRENCY } from '@/core/money';
import { useDataQuery, type Repositories } from '@/data';
import { useLocaleFormat } from '@/i18n';
import {
  Amount,
  Badge,
  BarChart,
  Button,
  Card,
  Chip,
  Divider,
  EmptyState,
  FormScreen,
  Icon,
  ListItem,
  ProgressBar,
  SegmentedControl,
  Text,
  type BadgeTone,
  LicensePlate,
} from '@/ui/components';
import { useBreakpoint } from '@/ui/layout/useBreakpoint';
import { radius, spacing, useTheme } from '@/ui/theme';

import { DEADLINE_TONES, deadlineLabel } from '../finance/DeadlineBadge';
import { EntryListItem } from '../finance/EntryListItem';
import { closeModal } from '../finance/navigation';
import { useFinanceLookups } from '../finance/useFinanceLookups';
import { useToday } from '../finance/useToday';
import { energyUnit, plateCountry, vehicleIcon, vehicleKindLabel } from './presentation';

async function loadVehicle(repositories: Repositories, id: string) {
  const [vehicle, entries, documents, externalCosts] = [
    await repositories.vehicles.get(id),
    await repositories.entries.listForVehicle(id),
    await repositories.documents.list(),
    await repositories.vehicleExternalCosts.listForVehicle(id),
  ];
  return {
    vehicle,
    entries,
    externalCosts,
    documents: documents.filter((document) => document.vehicleId === id),
  };
}

/**
 * Ficha do veículo (`/vehicles/[id]`): identificação, gastos por período, para onde vai o dinheiro,
 * obrigações com datas concretas, indicadores e o histórico. Tudo agrega os movimentos existentes
 * (ADR-054): nenhum valor é criado aqui.
 */
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
        <ActivityIndicator accessibilityLabel={t('common.loading')} />
      </FormScreen>
    );
  }
  const { vehicle, entries, documents, externalCosts } = query.data;
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
      externalCosts={externalCosts}
      documents={documents}
      lookups={lookups.data}
      onClose={close}
    />
  );
}

type Loaded = Awaited<ReturnType<typeof loadVehicle>>;
type Lookups = NonNullable<ReturnType<typeof useFinanceLookups>['data']>;

/** Obrigações que a ficha mostra sempre (as que não têm data aparecem como "por definir"). */
const OBLIGATIONS = ['insurance', 'inspection', 'roadTax', 'service'] as const;
type ObligationKind = (typeof OBLIGATIONS)[number];

function VehicleSheet({
  vehicle,
  entries,
  externalCosts,
  documents,
  lookups,
  onClose,
}: {
  vehicle: Vehicle;
  entries: Loaded['entries'];
  externalCosts: VehicleExternalCost[];
  documents: Loaded['documents'];
  lookups: Lookups;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { formatNumber } = useLocaleFormat();
  const today = useToday();
  const wide = useBreakpoint() !== 'compact';
  const [period, setPeriod] = useState<VehiclePeriod>('year');

  // Totais só numa moeda: a do veículo, ou a do primeiro movimento. Outras moedas não se somam.
  const currency = vehicle.currency ?? entries[0]?.currency ?? DEFAULT_CURRENCY;
  const inCurrency = entries.filter((entry) => entry.currency === currency);
  // Custos pagos por terceiros (ADR-081): contam no custo da viatura, na mesma moeda; nunca nas
  // contas. As estatísticas juntam os dois; a divisão mostra quem pagou.
  const external = externalCostEntries(externalCosts.filter((cost) => cost.currency === currency));
  const all = [...inCurrency, ...external];
  const overall = vehicleStats(vehicle, all, today);
  const inPeriod = vehicleStats(vehicle, entriesInPeriod(all, period, today), today);
  const shares = vehicleCostShares(
    entriesInPeriod(inCurrency, period, today),
    entriesInPeriod(external, period, today),
  );
  const odometer = currentOdometer(vehicle, [...entries, ...external]);
  const unit = energyUnit(vehicle);
  const costTypeLabel = (type: VehicleCostType) =>
    type === 'fuel' && unit === 'kwh'
      ? t('entryVehicle.chargeCostType')
      : t(`vehicles.costTypes.${type}`);

  const header = (
    <VehicleHeader vehicle={vehicle} odometer={odometer} formatKm={(km) => formatNumber(km)} />
  );
  const summary = (
    <SpendingCard
      period={period}
      onPeriod={setPeriod}
      spentInPeriod={inPeriod.spent}
      overall={overall}
      currency={currency}
      otherCurrency={
        inCurrency.length !== entries.length || external.length !== externalCosts.length
      }
      shares={externalCosts.length > 0 ? shares : null}
    />
  );
  const breakdown = (
    <Breakdown
      byType={inPeriod.byType}
      currency={currency}
      label={costTypeLabel}
      total={inPeriod.spent}
    />
  );
  const obligations = <Obligations vehicle={vehicle} today={today} odometer={odometer} />;
  const indicators = (
    <Indicators vehicle={vehicle} entries={all} currency={currency} today={today} />
  );
  const documentList = documents.length > 0 ? <Documents documents={documents} /> : null;
  const history = (
    <>
      <History entries={entries} lookups={lookups} costTypeLabel={costTypeLabel} />
      {externalCosts.length > 0 ? (
        <ExternalHistory costs={externalCosts} costTypeLabel={costTypeLabel} />
      ) : null}
    </>
  );
  const ownLabel = t('vehicleCosts.addOwn');
  const externalLabel = vehicle.costsPaidBy
    ? t('vehicleCosts.addExternal', { payer: vehicle.costsPaidBy })
    : t('vehicleCosts.addExternalGeneric');
  const addOwn = () =>
    router.push({ pathname: '/new-transaction', params: { vehicleId: vehicle.id } });
  const addExternal = () => router.push(`/vehicles/external/new?vehicleId=${vehicle.id}` as Href);
  // A ação principal é a omissão da viatura; a outra fica ao lado (ADR-081).
  const paidByOthers = vehicle.costsPaidBy !== null;

  return (
    <FormScreen
      width="wide"
      title={vehicle.name}
      closeLabel={t('common.close')}
      onClose={onClose}
      headerRight={
        <Button
          label={t('vehicles.edit')}
          variant="ghost"
          size="sm"
          icon="create-outline"
          onPress={() =>
            router.push({ pathname: '/vehicles/edit/[id]', params: { id: vehicle.id } })
          }
        />
      }
      footer={
        wide ? (
          <View style={styles.actionsWide}>
            <Button
              label={t('vehicles.link')}
              variant="secondary"
              icon="link-outline"
              onPress={() =>
                router.push({ pathname: '/vehicles/link/[id]', params: { id: vehicle.id } })
              }
            />
            <Button
              label={paidByOthers ? ownLabel : externalLabel}
              variant="secondary"
              onPress={paidByOthers ? addOwn : addExternal}
            />
            <Button
              label={paidByOthers ? externalLabel : ownLabel}
              icon="add"
              onPress={paidByOthers ? addExternal : addOwn}
            />
          </View>
        ) : (
          // Telemóvel: a ação principal a toda a largura; as outras duas numa linha por baixo.
          <View style={styles.actionsStack}>
            <Button
              label={paidByOthers ? externalLabel : ownLabel}
              icon="add"
              fullWidth
              onPress={paidByOthers ? addExternal : addOwn}
            />
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
                  label={paidByOthers ? ownLabel : t('vehicleCosts.addExternalShort')}
                  variant="secondary"
                  fullWidth
                  onPress={paidByOthers ? addOwn : addExternal}
                />
              </View>
            </View>
          </View>
        )
      }>
      {header}
      {wide ? (
        <View style={styles.columns}>
          <View style={styles.main}>
            {summary}
            {breakdown}
            {indicators}
          </View>
          <View style={styles.side}>
            {obligations}
            {documentList}
          </View>
        </View>
      ) : (
        <>
          {summary}
          {obligations}
          {breakdown}
          {indicators}
          {documentList}
        </>
      )}
      {history}
    </FormScreen>
  );
}

/** Identificação: ícone, marca e modelo, e as características em etiquetas. */
function VehicleHeader({
  vehicle,
  odometer,
  formatKm,
}: {
  vehicle: Vehicle;
  odometer: number | null;
  formatKm: (km: number) => string;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const makeModel = [vehicle.make, vehicle.model].filter(Boolean).join(' ');
  const facts = [
    vehicleKindLabel(t, vehicle),
    vehicle.year ? String(vehicle.year) : null,
    vehicle.fuelType ? t(`vehicles.fuelTypes.${vehicle.fuelType}`) : null,
  ].filter(Boolean) as string[];

  return (
    <View style={styles.header}>
      <View style={[styles.heroIcon, { backgroundColor: colors.primaryMuted }]}>
        <Icon name={vehicleIcon(vehicle)} size={32} color="primaryText" />
      </View>
      <View style={styles.headerText}>
        {makeModel ? (
          <Text variant="title3" accessibilityRole="text">
            {makeModel}
          </Text>
        ) : null}
        <View style={styles.badges}>
          {vehicle.plate ? (
            <LicensePlate
              value={vehicle.plate}
              country={plateCountry(vehicle.plate)}
              accessibilityLabel={t('vehicles.plateA11y', { plate: vehicle.plate })}
            />
          ) : null}
          {facts.map((fact) => (
            <Badge key={fact} label={fact} />
          ))}
          {odometer !== null ? (
            <Badge tone="accent" label={t('vehicles.km', { value: formatKm(odometer) })} />
          ) : null}
        </View>
      </View>
    </View>
  );
}

function SectionTitle({ children, action }: { children: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionTitle}>
      <Text variant="overline" tone="tertiary" accessibilityRole="header">
        {children}
      </Text>
      {action}
    </View>
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

function SpendingCard({
  period,
  onPeriod,
  spentInPeriod,
  overall,
  currency,
  otherCurrency,
  shares,
}: {
  period: VehiclePeriod;
  onPeriod: (period: VehiclePeriod) => void;
  spentInPeriod: number;
  overall: ReturnType<typeof vehicleStats>;
  currency: string;
  otherCurrency: boolean;
  /** Divisão do período entre o que a pessoa pagou e o que terceiros pagaram (só se houver). */
  shares: { own: number; others: number } | null;
}) {
  const { t } = useTranslation();
  const { formatMoney, formatUnitPrice } = useLocaleFormat();
  const money = (amountMinor: number) => ({ amountMinor, currency });

  return (
    <Card padding="lg">
      <View style={styles.cardBody}>
        <SegmentedControl
          accessibilityLabel={t('vehicles.period')}
          value={period}
          onChange={onPeriod}
          options={VEHICLE_PERIODS.map((value) => ({
            value,
            label: t(`vehicles.periods.${value}`),
          }))}
        />
        <View style={styles.figure}>
          <Text variant="footnote" tone="secondary">
            {t('vehicles.spentInPeriod')}
          </Text>
          <Amount value={money(spentInPeriod)} variant="amountHero" />
          {shares ? (
            <Text variant="footnote" tone="secondary" tabular>
              {`${t('vehicleCosts.sharesOwn')}: ${formatMoney(money(shares.own))} · ${t(
                'vehicleCosts.sharesOthers',
              )}: ${formatMoney(money(shares.others))}`}
            </Text>
          ) : null}
        </View>
        <Divider />
        <View style={styles.figures}>
          <Figure label={t('vehicles.total')}>
            <Amount value={money(overall.spent)} variant="bodyStrong" />
          </Figure>
          <Figure label={t('vehicles.ownership')}>
            <Amount value={money(overall.ownershipCost)} variant="bodyStrong" />
          </Figure>
          {overall.costPerKm ? (
            <Figure label={t('vehicles.costPerKm')}>
              <Text variant="bodyStrong" tabular>
                {t('vehicles.perKm', {
                  value: formatUnitPrice(overall.costPerKm.totalPerKm, currency),
                })}
              </Text>
            </Figure>
          ) : null}
        </View>
        <Text variant="footnote" tone="tertiary">
          {overall.purchase
            ? t(
                overall.purchase.source === 'entry'
                  ? 'vehicles.purchaseEntry'
                  : 'vehicles.purchaseInformative',
                { amount: formatMoney(money(overall.purchase.amount)) },
              )
            : t('vehicles.noPurchase')}
        </Text>
        {overall.beforeAcquisition > 0 ? (
          <Text variant="footnote" tone="tertiary">
            {t('vehicles.beforeAcquisition', { count: overall.beforeAcquisition })}
          </Text>
        ) : null}
        {otherCurrency ? (
          <Text variant="footnote" tone="tertiary">
            {t('vehicles.otherCurrency')}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

/** Para onde vai o dinheiro no período: cada tipo com a sua parte (sem a compra). */
function Breakdown({
  byType,
  currency,
  label,
  total,
}: {
  byType: Partial<Record<VehicleCostType, number>>;
  currency: string;
  label: (type: VehicleCostType) => string;
  total: number;
}) {
  const { t } = useTranslation();
  const { formatMoney, formatPercent } = useLocaleFormat();
  const types = VEHICLE_COST_TYPES.filter((type) => (byType[type] ?? 0) !== 0).sort(
    (a, b) => (byType[b] ?? 0) - (byType[a] ?? 0),
  );
  const positive = types.reduce((sum, type) => sum + Math.max(0, byType[type] ?? 0), 0);

  return (
    <View style={styles.section}>
      <SectionTitle>{t('vehicles.breakdown')}</SectionTitle>
      {types.length === 0 || total === 0 ? (
        <Text variant="callout" tone="secondary">
          {t('vehicles.breakdownEmpty')}
        </Text>
      ) : (
        <View style={styles.breakdown}>
          {types.map((type) => {
            const amount = byType[type] ?? 0;
            const share = positive > 0 ? Math.max(0, amount) / positive : 0;
            const text = formatMoney({ amountMinor: amount, currency });
            return (
              <View key={type} style={styles.breakdownRow}>
                <View style={styles.breakdownLine}>
                  <Text variant="label" style={styles.flex} numberOfLines={1}>
                    {label(type)}
                  </Text>
                  <Text variant="label" tabular>
                    {text}
                  </Text>
                </View>
                <ProgressBar
                  progress={share}
                  height={6}
                  accessibilityLabel={`${label(type)}: ${text}, ${t('vehicles.breakdownShare', {
                    share: formatPercent(share),
                  })}`}
                />
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

/** Seguro, inspeção, IUC e revisão: data concreta, estado e quanto falta (ou "sem data"). */
function Obligations({
  vehicle,
  today,
  odometer,
}: {
  vehicle: Vehicle;
  today: CalendarDate;
  odometer: number | null;
}) {
  const { t } = useTranslation();
  const { formatDate, formatNumber } = useLocaleFormat();
  const dateOf: Record<ObligationKind, CalendarDate | null> = {
    insurance: vehicle.insuranceDue,
    inspection: vehicle.inspectionDue,
    roadTax: vehicle.roadTaxDue,
    service: vehicle.serviceDueOn,
  };
  const icons: Record<
    ObligationKind,
    'shield-checkmark-outline' | 'clipboard-outline' | 'receipt-outline' | 'construct-outline'
  > = {
    insurance: 'shield-checkmark-outline',
    inspection: 'clipboard-outline',
    roadTax: 'receipt-outline',
    service: 'construct-outline',
  };

  return (
    <View style={styles.section}>
      <SectionTitle>{t('vehicles.obligations')}</SectionTitle>
      <Card padding="xs">
        {OBLIGATIONS.map((kind, index) => {
          const date = dateOf[kind];
          const days = daysUntil(date, today);
          let status = deadlineStatus(date, today);
          let badge: { label: string; tone: BadgeTone } | null =
            date !== null && days !== null && status !== 'none'
              ? { label: deadlineLabel(t, days), tone: DEADLINE_TONES[status] }
              : null;
          const parts: string[] = [];
          if (date)
            parts.push(
              t('vehicles.dueOn', { date: formatDate(calendarDateToLocalDate(date), 'medium') }),
            );
          // Revisão também por quilómetros: o que chegar primeiro.
          if (kind === 'service' && vehicle.serviceDueKm !== null) {
            parts.push(t('vehicles.km', { value: formatNumber(vehicle.serviceDueKm) }));
            const kmLeft = odometer === null ? null : vehicle.serviceDueKm - odometer;
            if (kmLeft !== null) {
              const kmStatus = kmLeft < 0 ? 'overdue' : kmLeft <= SERVICE_SOON_KM ? 'soon' : 'ok';
              const worse =
                status === 'none' ||
                (kmStatus === 'overdue' && status !== 'overdue') ||
                (kmStatus === 'soon' && status === 'ok');
              if (worse) {
                status = kmStatus;
                badge = {
                  label:
                    kmLeft >= 0
                      ? t('vehicles.kmLeft', { value: formatNumber(kmLeft) })
                      : t('vehicles.kmOver', { value: formatNumber(-kmLeft) }),
                  tone: DEADLINE_TONES[kmStatus],
                };
              }
            }
          }
          return (
            <View key={kind}>
              {index > 0 ? <Divider inset={spacing.lg} /> : null}
              <ListItem
                icon={icons[kind]}
                iconColor={
                  status === 'overdue'
                    ? 'negative'
                    : status === 'soon'
                      ? 'warning'
                      : 'textSecondary'
                }
                iconBackground={
                  status === 'overdue'
                    ? 'negativeMuted'
                    : status === 'soon'
                      ? 'warningMuted'
                      : 'surfaceMuted'
                }
                title={t(`vehicles.deadlineKinds.${kind}`)}
                subtitle={parts.length > 0 ? parts.join(' · ') : t('vehicles.notSet')}
                showChevron={false}
                trailing={badge ? <Badge label={badge.label} tone={badge.tone} /> : null}
              />
            </View>
          );
        })}
      </Card>
    </View>
  );
}

/** Abastecimentos, consumo, custo por km e evolução, só com dados suficientes. */
function Indicators({
  vehicle,
  entries,
  currency,
  today,
}: {
  vehicle: Vehicle;
  /** Movimentos e custos pagos por terceiros, na moeda da viatura (ADR-081). */
  entries: readonly VehicleEntry[];
  currency: string;
  today: CalendarDate;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { formatDecimal, formatMoney, formatNumber, formatUnitPrice, locale } = useLocaleFormat();
  const stats = vehicleStats(vehicle, entries, today);
  const unit = energyUnit(vehicle);
  const series = vehicleMonthlyCosts(entries, today);
  const hasSeries = series.some((item) => item.amount > 0);
  const year = Number(today.slice(0, 4));
  const monthName = new Intl.DateTimeFormat(locale, { month: 'short' });
  const money = (amountMinor: number) => formatMoney({ amountMinor, currency });

  return (
    <View style={styles.section}>
      <SectionTitle>{t('vehicles.indicators')}</SectionTitle>
      <Card padding="lg">
        <View style={styles.cardBody}>
          <View style={styles.figures}>
            {stats.fuel.fills > 0 ? (
              <Figure label={t(unit === 'kwh' ? 'vehicles.charges' : 'vehicles.fills')}>
                <Text variant="bodyStrong" tabular>
                  {unit === 'kwh'
                    ? t('vehicles.chargeSummary', {
                        kwh: formatDecimal(stats.fuel.quantityMilli / 1000, 1),
                        count: stats.fuel.fills,
                      })
                    : t('vehicles.fuelSummary', {
                        litres: formatDecimal(stats.fuel.quantityMilli / 1000, 1),
                        count: stats.fuel.fills,
                      })}
                </Text>
              </Figure>
            ) : null}
            {stats.fuel.pricePerLitre !== null ? (
              <Figure label={t('vehicles.pricePerUnit')}>
                <Text variant="bodyStrong" tabular>
                  {t(unit === 'kwh' ? 'vehicles.perKwh' : 'vehicles.perLitre', {
                    price: formatUnitPrice(stats.fuel.pricePerLitre, currency),
                  })}
                </Text>
              </Figure>
            ) : null}
            {stats.costPerKm?.quantityPer100Km != null ? (
              <Figure label={t('vehicles.consumption')}>
                <Text variant="bodyStrong" tabular>
                  {t(unit === 'kwh' ? 'vehicles.per100Kwh' : 'vehicles.per100Litres', {
                    value: formatDecimal(stats.costPerKm.quantityPer100Km / 1000, 1),
                  })}
                </Text>
              </Figure>
            ) : null}
            {stats.costPerKm ? (
              <>
                <Figure label={t('vehicles.costPerKm')}>
                  <Text variant="bodyStrong" tabular>
                    {t('vehicles.perKm', {
                      value: formatUnitPrice(stats.costPerKm.totalPerKm, currency),
                    })}
                  </Text>
                </Figure>
                <Figure label={t('vehicles.costPer100Km')}>
                  <Text variant="bodyStrong" tabular>
                    {money(Math.round(stats.costPerKm.totalPerKm * 100))}
                  </Text>
                </Figure>
              </>
            ) : null}
          </View>
          {stats.costPerKm ? (
            <Text variant="footnote" tone="tertiary">
              {t('vehicles.kmRange', {
                from: formatNumber(stats.costPerKm.fromKm),
                to: formatNumber(stats.costPerKm.toKm),
              })}
            </Text>
          ) : (
            <Text variant="footnote" tone="secondary">
              {t('vehicles.needMoreData')}
            </Text>
          )}
          <Divider />
          <Text variant="label">{t('vehicles.evolution')}</Text>
          {hasSeries ? (
            <BarChart
              height={96}
              seriesColors={[colors.primary]}
              groups={series.map((item, index) => ({
                key: item.month,
                label: monthName.format(monthKeyToLocalDate(item.month)).replace('.', ''),
                values: [Math.max(0, item.amount)],
                highlighted: index === series.length - 1,
                accessibilityLabel: t('vehicles.monthTotal', {
                  month: monthName.format(monthKeyToLocalDate(item.month)),
                  amount: money(item.amount),
                }),
              }))}
            />
          ) : (
            <Text variant="footnote" tone="secondary">
              {t('vehicles.evolutionEmpty')}
            </Text>
          )}
          <Text variant="footnote" tone="secondary">
            {t('vehicles.compareYears', {
              current: money(vehicleYearCost(entries, String(year))),
              previous: money(vehicleYearCost(entries, String(year - 1))),
            })}
          </Text>
        </View>
      </Card>
    </View>
  );
}

function Documents({ documents }: { documents: Loaded['documents'] }) {
  const { t } = useTranslation();
  const { formatDate } = useLocaleFormat();
  return (
    <View style={styles.section}>
      <SectionTitle>{t('vehicles.documents')}</SectionTitle>
      <Card padding="xs">
        {documents.map((document, index) => (
          <View key={document.id}>
            {index > 0 ? <Divider inset={spacing.lg} /> : null}
            <ListItem
              icon="document-text-outline"
              iconColor="textSecondary"
              iconBackground="surfaceMuted"
              title={document.title}
              subtitle={
                document.expiresOn
                  ? formatDate(calendarDateToLocalDate(document.expiresOn), 'medium')
                  : undefined
              }
              onPress={() =>
                router.push({ pathname: '/documents/[id]', params: { id: document.id } })
              }
            />
          </View>
        ))}
      </Card>
    </View>
  );
}

/** Os mesmos movimentos da área de Movimentos, filtráveis pelo tipo de custo. */
/** Custos pagos por terceiros: à parte dos movimentos, com quem pagou e editáveis (ADR-081). */
function ExternalHistory({
  costs,
  costTypeLabel,
}: {
  costs: VehicleExternalCost[];
  costTypeLabel: (type: VehicleCostType) => string;
}) {
  const { t } = useTranslation();
  const { formatMoney, formatDate } = useLocaleFormat();
  return (
    <View style={styles.section}>
      <SectionTitle
        action={
          <Text variant="footnote" tone="tertiary">
            {t('vehicleCosts.count', { count: costs.length })}
          </Text>
        }>
        {t('vehicleCosts.historyTitle')}
      </SectionTitle>
      <Card padding="xs">
        {costs.map((cost, index) => {
          const payer = cost.payer
            ? t('vehicleCosts.paidBy', { payer: cost.payer })
            : t('vehicleCosts.paidByOthers');
          const amount = formatMoney({ amountMinor: cost.amount, currency: cost.currency });
          const date = formatDate(calendarDateToLocalDate(cost.date), 'medium');
          return (
            <View key={cost.id}>
              {index > 0 ? <Divider inset={spacing.lg} /> : null}
              <ListItem
                icon="business-outline"
                iconColor="textSecondary"
                iconBackground="surfaceMuted"
                title={cost.description || costTypeLabel(cost.costType)}
                subtitle={`${payer} · ${costTypeLabel(cost.costType)} · ${date}`}
                trailing={
                  <Text variant="bodyStrong" tabular>
                    {amount}
                  </Text>
                }
                onPress={() => router.push(`/vehicles/external/${cost.id}` as Href)}
              />
            </View>
          );
        })}
      </Card>
    </View>
  );
}

function History({
  entries,
  lookups,
  costTypeLabel,
}: {
  entries: Loaded['entries'];
  lookups: Lookups;
  costTypeLabel: (type: VehicleCostType) => string;
}) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<VehicleCostType | null>(null);
  const present = VEHICLE_COST_TYPES.filter((type) =>
    entries.some((entry) => (entry.vehicleCostType ?? 'other') === type),
  );
  const shown = filter
    ? entries.filter((entry) => (entry.vehicleCostType ?? 'other') === filter)
    : entries;

  return (
    <View style={styles.section}>
      <SectionTitle
        action={
          <Text variant="footnote" tone="tertiary">
            {t('vehicles.historyCount', { count: shown.length })}
          </Text>
        }>
        {t('vehicles.history')}
      </SectionTitle>
      {present.length > 1 ? (
        <View style={styles.chips} accessibilityRole="radiogroup">
          <Chip
            label={t('vehicles.historyAll')}
            selected={filter === null}
            onPress={() => setFilter(null)}
          />
          {present.map((type) => (
            <Chip
              key={type}
              label={costTypeLabel(type)}
              selected={filter === type}
              onPress={() => setFilter(filter === type ? null : type)}
            />
          ))}
        </View>
      ) : null}
      <Card padding="xs">
        {entries.length === 0 ? (
          <View style={styles.padded}>
            <Text variant="callout" tone="secondary">
              {t('vehicles.noEntries')}
            </Text>
          </View>
        ) : shown.length === 0 ? (
          <View style={styles.padded}>
            <Text variant="callout" tone="secondary">
              {t('vehicles.historyEmptyType')}
            </Text>
          </View>
        ) : (
          shown.map((entry, index) => {
            const category = entry.categoryId
              ? lookups.categories.get(entry.categoryId)
              : undefined;
            const detail = [
              costTypeLabel(entry.vehicleCostType ?? 'other'),
              entry.description && category ? category.name : null,
            ]
              .filter(Boolean)
              .join(' · ');
            return (
              <View key={entry.id}>
                {index > 0 ? <Divider inset={spacing.lg} /> : null}
                <EntryListItem
                  entry={entry}
                  lookups={lookups}
                  detail={detail}
                  onPress={() => router.push({ pathname: '/entry/[id]', params: { id: entry.id } })}
                />
              </View>
            );
          })
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: spacing.sm },
  actionsStack: { gap: spacing.sm },
  actionsWide: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, minWidth: 0, gap: spacing.sm },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, alignItems: 'center' },
  columns: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xl },
  main: { flex: 3, minWidth: 0, gap: spacing.xl },
  side: { flex: 2, minWidth: 0, gap: spacing.xl },
  section: { gap: spacing.sm },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
    minHeight: 24,
  },
  cardBody: { gap: spacing.md },
  figures: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xl },
  figure: { gap: spacing.xxs, minWidth: 110 },
  breakdown: { gap: spacing.md },
  breakdownRow: { gap: spacing.xs },
  breakdownLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  padded: { padding: spacing.md },
});
