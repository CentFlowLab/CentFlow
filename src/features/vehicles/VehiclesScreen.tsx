import { router, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { calendarDateToLocalDate, vehicleDeadlines, type Vehicle } from '@/core/finance';
import { useDataQuery, useRepositories, type Repositories } from '@/data';
import { useLocaleFormat } from '@/i18n';
import {
  Button,
  Card,
  EmptyState,
  IconButton,
  ListItem,
  Screen,
  Badge,
  Dialog,
  SwipeableRow,
  Text,
} from '@/ui/components';
import { radius, spacing, useTheme } from '@/ui/theme';

import { DEADLINE_TONES, deadlineLabel } from '../finance/DeadlineBadge';
import { useToday } from '../finance/useToday';
import { vehicleIcon, vehicleKindLabel } from './presentation';

export function VehiclesScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { formatNumber } = useLocaleFormat();
  const today = useToday();
  const query = useDataQuery(
    useCallback((repositories: Repositories) => repositories.vehicles.list(), []),
  );
  const repositories = useRepositories();
  // Eliminar a partir da lista: pede confirmação com o número de movimentos ligados (ADR-054).
  const [deleting, setDeleting] = useState<{ vehicle: Vehicle; entries: number } | null>(null);
  const askDelete = async (vehicle: Vehicle) => {
    const links = await repositories.vehicles.countLinks(vehicle.id);
    setDeleting({ vehicle, entries: links.entries });
  };
  const add = () => router.push('/vehicles/new' as Href);
  const header = {
    title: t('nav.vehicles'),
    subtitle: t('vehicles.subtitle'),
    headerRight: (
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
          <ActivityIndicator color={colors.primary} style={styles.loading} />
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

  return (
    <Screen {...header}>
      <View style={styles.list}>
        {query.data.map((vehicle) => (
          <SwipeableRow
            key={vehicle.id}
            borderRadius={radius.xl}
            actions={[
              {
                label: t('vehicles.edit'),
                icon: 'create-outline',
                onPress: () =>
                  router.push({ pathname: '/vehicles/edit/[id]', params: { id: vehicle.id } }),
              },
              {
                label: t('vehicles.delete'),
                icon: 'trash-outline',
                tone: 'negative',
                onPress: () => void askDelete(vehicle),
              },
            ]}>
            <Card style={styles.card}>
              <ListItem
                title={vehicle.name}
                subtitle={[
                  vehicleKindLabel(t, vehicle),
                  vehicle.plate,
                  vehicle.odometerKm === null
                    ? null
                    : t('vehicles.km', { value: formatNumber(vehicle.odometerKm) }),
                ]
                  .filter(Boolean)
                  .join(' · ')}
                icon={vehicleIcon(vehicle)}
                onPress={() => router.push(`/vehicles/${vehicle.id}` as Href)}
              />
              <VehicleDeadlines vehicle={vehicle} today={today} />
            </Card>
          </SwipeableRow>
        ))}
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

/** Prazos do veículo, do mais urgente: "Seguro · 1 mar 2027 — Expira em 110 dias". */
function VehicleDeadlines({ vehicle, today }: { vehicle: Vehicle; today: string }) {
  const { t } = useTranslation();
  const { formatDate, formatNumber } = useLocaleFormat();
  const deadlines = vehicleDeadlines(vehicle, today, vehicle.odometerKm);
  if (deadlines.length === 0) return null;
  return (
    <View style={styles.deadlines}>
      {deadlines.map((deadline) => {
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
          <View key={deadline.kind} style={styles.deadline}>
            <Text variant="footnote" tone="secondary" style={styles.flex}>
              {`${t(`vehicles.deadlineKinds.${deadline.kind}`)} · ${when}`}
            </Text>
            <Badge label={label} tone={DEADLINE_TONES[deadline.status]} />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { marginTop: spacing.xl },
  list: { gap: spacing.md },
  card: { gap: spacing.sm },
  deadlines: { gap: spacing.xs, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  deadline: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
});
