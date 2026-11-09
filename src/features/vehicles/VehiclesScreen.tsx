import { router, type Href } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { calendarDateToLocalDate, type Vehicle } from '@/core/finance';
import { useDataQuery, type Repositories } from '@/data';
import { useLocaleFormat } from '@/i18n';
import {
  Button,
  Card,
  EmptyState,
  IconButton,
  ListItem,
  Screen,
  Text,
  type IconName,
} from '@/ui/components';
import { spacing, useTheme } from '@/ui/theme';

import { DeadlineBadge } from '../finance/DeadlineBadge';
import { useToday } from '../finance/useToday';

const ICONS: Record<Vehicle['kind'], IconName> = {
  car: 'car-outline',
  motorcycle: 'bicycle-outline',
  van: 'bus-outline',
  bicycle: 'bicycle-outline',
  other: 'cube-outline',
};

export function VehiclesScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { formatDate, formatNumber } = useLocaleFormat();
  const today = useToday();
  const query = useDataQuery(
    useCallback((repositories: Repositories) => repositories.vehicles.list(), []),
  );
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

  const day = (value: string) => formatDate(calendarDateToLocalDate(value), 'medium');
  return (
    <Screen {...header}>
      <View style={styles.list}>
        {query.data.map((vehicle) => (
          <Card key={vehicle.id} style={styles.card}>
            <ListItem
              title={vehicle.name}
              subtitle={[
                t(`vehicles.kinds.${vehicle.kind}`),
                vehicle.plate,
                vehicle.odometerKm === null
                  ? null
                  : t('vehicles.km', { value: formatNumber(vehicle.odometerKm) }),
              ]
                .filter(Boolean)
                .join(' · ')}
              icon={ICONS[vehicle.kind]}
              onPress={() => router.push(`/vehicles/${vehicle.id}` as Href)}
            />
            {vehicle.inspectionDue !== null || vehicle.insuranceDue !== null ? (
              <View style={styles.deadlines}>
                {vehicle.inspectionDue !== null ? (
                  <View style={styles.deadline}>
                    <Text variant="footnote" tone="secondary" style={styles.flex}>
                      {t('vehicles.inspectionOn', { date: day(vehicle.inspectionDue) })}
                    </Text>
                    <DeadlineBadge date={vehicle.inspectionDue} today={today} />
                  </View>
                ) : null}
                {vehicle.insuranceDue !== null ? (
                  <View style={styles.deadline}>
                    <Text variant="footnote" tone="secondary" style={styles.flex}>
                      {t('vehicles.insuranceOn', { date: day(vehicle.insuranceDue) })}
                    </Text>
                    <DeadlineBadge date={vehicle.insuranceDue} today={today} />
                  </View>
                ) : null}
              </View>
            ) : null}
          </Card>
        ))}
      </View>
    </Screen>
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
