import { router, type Href } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { calendarDateToLocalDate, type DocumentRecord } from '@/core/finance';
import { useDataQuery, type Repositories } from '@/data';
import { useLocaleFormat } from '@/i18n';
import {
  Button,
  Card,
  EmptyState,
  IconButton,
  ListItem,
  Screen,
  type IconName,
} from '@/ui/components';
import { spacing, useTheme } from '@/ui/theme';

import { DeadlineBadge } from '../finance/DeadlineBadge';
import { useToday } from '../finance/useToday';

const ICONS: Record<DocumentRecord['category'], IconName> = {
  identity: 'id-card-outline',
  vehicle: 'car-outline',
  home: 'home-outline',
  health: 'medkit-outline',
  tax: 'receipt-outline',
  insurance: 'shield-checkmark-outline',
  work: 'briefcase-outline',
  other: 'document-text-outline',
};

export function DocumentsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { formatDate } = useLocaleFormat();
  const today = useToday();
  const query = useDataQuery(
    useCallback((repositories: Repositories) => repositories.documents.list(), []),
  );
  const add = () => router.push('/documents/new' as Href);
  const header = {
    title: t('nav.documents'),
    subtitle: t('documents.subtitle'),
    headerRight: (
      <IconButton
        icon="add"
        variant="filled"
        accessibilityLabel={t('documents.add')}
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
          icon="document-text-outline"
          title={t('documents.emptyTitle')}
          description={t('documents.emptyDescription')}>
          <Button label={t('documents.start')} onPress={add} />
        </EmptyState>
      </Screen>
    );
  }

  return (
    <Screen {...header}>
      <Card padding="xs">
        {query.data.map((record) => (
          <ListItem
            key={record.id}
            title={record.title}
            subtitle={[
              t(`documents.categories.${record.category}`),
              record.expiresOn === null
                ? t('documents.noExpiry')
                : t('documents.expiresOn', {
                    date: formatDate(calendarDateToLocalDate(record.expiresOn), 'medium'),
                  }),
            ].join(' · ')}
            icon={ICONS[record.category]}
            onPress={() => router.push(`/documents/${record.id}` as Href)}
            trailing={<DeadlineBadge date={record.expiresOn} today={today} />}
          />
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({ loading: { marginTop: spacing.xl } });
