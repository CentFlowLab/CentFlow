import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator } from 'react-native';

import { useDataQuery, type Repositories } from '@/data';
import { EmptyState, FormScreen } from '@/ui/components';
import { useTheme } from '@/ui/theme';

import { closeModal } from '../finance/navigation';
import { AccountForm } from './AccountForm';

/** `/account/new` */
export function NewAccountScreen() {
  return <AccountForm />;
}

/** `/account/[id]` */
export function EditAccountScreen({ id }: { id: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const query = useDataQuery(
    useCallback(
      async (repositories: Repositories) =>
        (await repositories.accounts.listWithBalances({ includeArchived: true })).find(
          (account) => account.id === id,
        ) ?? null,
      [id],
    ),
  );

  if (query.data) return <AccountForm key={query.data.id} account={query.data} />;

  return (
    <FormScreen
      title={t('accountForm.editTitle')}
      closeLabel={t('common.close')}
      onClose={() => closeModal('/accounts')}>
      {query.status === 'success' ? (
        <EmptyState icon="search-outline" title={t('accountForm.notFoundTitle')} />
      ) : (
        <ActivityIndicator color={colors.primary} />
      )}
    </FormScreen>
  );
}
