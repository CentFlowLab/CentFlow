import { router, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useDataQuery, type Repositories } from '@/data';
import { Button, EmptyState, FormScreen } from '@/ui/components';
import { useTheme } from '@/ui/theme';

import { closeModal } from '../finance/navigation';
import { useFinanceLookups } from '../finance/useFinanceLookups';
import { useToday } from '../finance/useToday';
import { EntryForm, type EntryPrefill } from './EntryForm';

function Loading() {
  const { colors } = useTheme();
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

/** Registo rápido: `/new-transaction`. */
export function NewEntryScreen() {
  const { t } = useTranslation();
  // Vindo da ficha de um veículo (`?vehicleId=…`), de "Duplicar" (`?duplicateOf=…`) ou do
  // pagamento de uma subscrição (`?subscriptionId=…`).
  const { vehicleId, duplicateOf, subscriptionId } = useLocalSearchParams<{
    vehicleId?: string;
    duplicateOf?: string;
    subscriptionId?: string;
  }>();
  const today = useToday();
  const lookups = useFinanceLookups();
  const source = useDataQuery(
    useCallback(
      async (repositories: Repositories) => ({
        entry: duplicateOf ? await repositories.entries.get(duplicateOf) : null,
        subscription: subscriptionId ? await repositories.subscriptions.get(subscriptionId) : null,
      }),
      [duplicateOf, subscriptionId],
    ),
  );

  if (!lookups.data || !source.data) {
    return (
      <FormScreen
        title={t('entryForm.newTitle')}
        closeLabel={t('common.close')}
        onClose={() => closeModal()}>
        <Loading />
      </FormScreen>
    );
  }

  if (!lookups.data.accountList.some((account) => !account.archivedAt)) {
    return (
      <FormScreen
        title={t('entryForm.newTitle')}
        closeLabel={t('common.close')}
        onClose={() => closeModal()}>
        <EmptyState
          icon="wallet-outline"
          title={t('entryForm.noAccountsTitle')}
          description={t('entryForm.noAccountsDescription')}>
          <Button
            label={t('entryForm.createAccount')}
            icon="add"
            onPress={() => router.replace('/account/new')}
          />
        </EmptyState>
      </FormScreen>
    );
  }

  const { entry: original, subscription } = source.data;
  const prefill: EntryPrefill | undefined = original
    ? {
        type: original.type,
        amount: original.amount,
        categoryId: original.categoryId,
        accountId: original.accountId,
        destinationAccountId: original.destinationAccountId,
        description: original.description,
        notes: original.notes ?? '',
        // O duplicado é de hoje; muda-se a data se for preciso.
        date: null,
      }
    : subscription
      ? {
          type: 'expense',
          amount: subscription.amount,
          categoryId: subscription.categoryId,
          accountId: null,
          destinationAccountId: null,
          description: subscription.name,
          notes: '',
          date: subscription.nextOn <= today ? subscription.nextOn : today,
        }
      : undefined;

  return (
    <EntryForm
      lookups={lookups.data}
      today={today}
      initialVehicleId={vehicleId}
      prefill={prefill}
      subscription={subscription ?? undefined}
    />
  );
}

/** Edição: `/entry/[id]`. */
export function EditEntryScreen({ id }: { id: string }) {
  const { t } = useTranslation();
  const today = useToday();
  const lookups = useFinanceLookups();
  const entry = useDataQuery(
    useCallback((repositories: Repositories) => repositories.entries.get(id), [id]),
  );

  if (entry.status === 'success' && entry.data === null) {
    return (
      <FormScreen
        title={t('entryForm.editTitle')}
        closeLabel={t('common.close')}
        onClose={() => closeModal('/transactions')}>
        <EmptyState
          icon="search-outline"
          title={t('entryForm.notFoundTitle')}
          description={t('entryForm.notFoundDescription')}
        />
      </FormScreen>
    );
  }

  if (!lookups.data || !entry.data) {
    return (
      <FormScreen
        title={t('entryForm.editTitle')}
        closeLabel={t('common.close')}
        onClose={() => closeModal('/transactions')}>
        <Loading />
      </FormScreen>
    );
  }

  return <EntryForm key={entry.data.id} lookups={lookups.data} today={today} entry={entry.data} />;
}

const styles = StyleSheet.create({
  center: {
    paddingVertical: 64,
    alignItems: 'center',
  },
});
