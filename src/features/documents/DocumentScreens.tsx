import { useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator } from 'react-native';

import { useDataQuery, type Repositories } from '@/data';
import { EmptyState, FormScreen } from '@/ui/components';

import { closeModal } from '../finance/navigation';
import { DocumentForm } from './DocumentForm';

export function NewDocumentScreen() {
  return <DocumentForm />;
}

export function DocumentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const query = useDataQuery(
    useCallback((repositories: Repositories) => repositories.documents.get(id), [id]),
  );
  if (query.data) return <DocumentForm record={query.data} />;
  return (
    <FormScreen
      title={t('documents.detailTitle')}
      closeLabel={t('common.close')}
      onClose={() => closeModal('/documents')}>
      {query.status === 'success' ? (
        <EmptyState icon="search-outline" title={t('documents.notFoundTitle')} />
      ) : (
        <ActivityIndicator />
      )}
    </FormScreen>
  );
}
