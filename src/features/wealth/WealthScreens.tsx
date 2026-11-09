import { useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator } from 'react-native';

import { useDataQuery, type Repositories } from '@/data';
import { EmptyState, FormScreen } from '@/ui/components';

import { closeModal } from '../finance/navigation';
import { WealthForm } from './WealthForm';

export function NewWealthScreen() {
  return <WealthForm />;
}

export function WealthDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const query = useDataQuery(
    useCallback((repositories: Repositories) => repositories.wealth.get(id), [id]),
  );
  if (query.data) return <WealthForm item={query.data} />;
  return (
    <FormScreen
      title={t('wealth.detailTitle')}
      closeLabel={t('common.close')}
      onClose={() => closeModal('/wealth')}>
      {query.status === 'success' ? (
        <EmptyState icon="search-outline" title={t('wealth.notFoundTitle')} />
      ) : (
        <ActivityIndicator />
      )}
    </FormScreen>
  );
}
