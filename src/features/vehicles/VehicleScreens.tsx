import { useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator } from 'react-native';

import { useDataQuery, type Repositories } from '@/data';
import { EmptyState, FormScreen } from '@/ui/components';

import { closeModal } from '../finance/navigation';
import { VehicleForm } from './VehicleForm';

export function NewVehicleScreen() {
  return <VehicleForm />;
}

export function VehicleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const query = useDataQuery(
    useCallback((repositories: Repositories) => repositories.vehicles.get(id), [id]),
  );
  if (query.data) return <VehicleForm vehicle={query.data} />;
  return (
    <FormScreen
      title={t('vehicles.detailTitle')}
      closeLabel={t('common.close')}
      onClose={() => closeModal('/vehicles')}>
      {query.status === 'success' ? (
        <EmptyState icon="search-outline" title={t('vehicles.notFoundTitle')} />
      ) : (
        <ActivityIndicator />
      )}
    </FormScreen>
  );
}
