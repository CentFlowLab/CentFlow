import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { calendarDateToLocalDate, type Subscription } from '@/core/finance';
import { useDataQuery, useRepositories, type Repositories } from '@/data';
import { useLocaleFormat } from '@/i18n';
import {
  Amount,
  Badge,
  Button,
  Card,
  Dialog,
  EmptyState,
  FormScreen,
  Text,
  type BadgeTone,
} from '@/ui/components';
import { spacing, useTheme } from '@/ui/theme';

import { closeModal } from '../finance/navigation';
import { SubscriptionForm } from './SubscriptionForm';

const STATUS_TONE: Record<Subscription['status'], BadgeTone> = {
  active: 'positive',
  paused: 'warning',
  cancelled: 'neutral',
};

async function loadDetail(repositories: Repositories, id: string) {
  const [subscription, categories] = await Promise.all([
    repositories.subscriptions.get(id),
    repositories.categories.list('expense'),
  ]);
  return {
    subscription,
    category: categories.find((category) => category.id === subscription?.categoryId) ?? null,
  };
}

export function NewSubscriptionScreen() {
  return <SubscriptionForm />;
}

export function SubscriptionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { formatDate } = useLocaleFormat();
  const repositories = useRepositories();
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState(false);
  const query = useDataQuery(useCallback((repos: Repositories) => loadDetail(repos, id), [id]));
  const item = query.data?.subscription;

  if (editing && item) {
    return (
      <SubscriptionForm
        subscription={item}
        onClose={() => setEditing(false)}
        onSaved={() => setEditing(false)}
      />
    );
  }

  return (
    <FormScreen
      title={item?.name ?? t('subscriptions.detailTitle')}
      closeLabel={t('common.close')}
      onClose={() => closeModal('/subscriptions')}
      footer={
        item ? (
          <View style={styles.actions}>
            {item.status === 'active' ? (
              // O compromisso só vira despesa real quando a pessoa confirma o pagamento.
              <Button
                label={t('subscriptions.recordPayment')}
                icon="checkmark-circle-outline"
                onPress={() =>
                  router.push({ pathname: '/new-transaction', params: { subscriptionId: item.id } })
                }
              />
            ) : null}
            <Button
              label={t('subscriptions.edit')}
              variant="secondary"
              onPress={() => setEditing(true)}
            />
            <Button
              label={t('subscriptions.delete')}
              variant="destructive"
              onPress={() => setConfirming(true)}
            />
          </View>
        ) : undefined
      }>
      {!query.data ? (
        query.status === 'error' ? (
          <EmptyState icon="alert-circle-outline" title={t('errors.loadFailed')} />
        ) : (
          <ActivityIndicator color={colors.primary} />
        )
      ) : !item ? (
        <EmptyState icon="search-outline" title={t('subscriptions.notFoundTitle')} />
      ) : (
        <Card>
          <View style={styles.detail}>
            <Badge
              label={t(`subscriptions.status.${item.status}`)}
              tone={STATUS_TONE[item.status]}
            />
            <Amount
              value={{ amountMinor: item.amount, currency: item.currency }}
              variant="amountHero"
            />
            <Text variant="body" tone="secondary">
              {t(`budgets.period.${item.period}`)}
            </Text>
            <Text variant="callout">
              {t('subscriptions.form.startsOn')}:{' '}
              {formatDate(calendarDateToLocalDate(item.startsOn), 'medium')}
            </Text>
            <Text variant="callout">
              {t('subscriptions.nextOn')}:{' '}
              {formatDate(calendarDateToLocalDate(item.nextOn), 'medium')}
            </Text>
            <Text variant="callout" tone="secondary">
              {query.data.category?.name ?? t('subscriptions.noneCategory')}
            </Text>
            <Text variant="caption" tone="tertiary">
              {t('subscriptions.doesNotChangeBalances')}
            </Text>
          </View>
        </Card>
      )}
      <Dialog
        visible={confirming}
        title={t('subscriptions.deleteTitle')}
        message={t('subscriptions.deleteMessage')}
        onDismiss={() => setConfirming(false)}
        actions={[
          {
            label: t('subscriptions.delete'),
            variant: 'destructive',
            onPress: () => {
              setConfirming(false);
              if (!item) return;
              void repositories.subscriptions.delete(item.id).then(
                () => closeModal('/subscriptions'),
                () => router.back(),
              );
            },
          },
          {
            label: t('common.cancel'),
            variant: 'ghost',
            onPress: () => setConfirming(false),
          },
        ]}
      />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing.sm },
  detail: { gap: spacing.sm },
});
