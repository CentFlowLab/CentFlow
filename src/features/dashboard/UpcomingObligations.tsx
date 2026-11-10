import { router } from 'expo-router';
import { Fragment, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import {
  calendarDateToLocalDate,
  obligationDays,
  upcomingObligations,
  type CalendarDate,
  type Obligation,
} from '@/core/finance';
import { useDataQuery, type Repositories } from '@/data';
import { useLocaleFormat } from '@/i18n';
import { Card, Divider, ListItem, Section, Text, type IconName } from '@/ui/components';
import { spacing } from '@/ui/theme';

/** Dias à frente mostrados no Início. */
export const OBLIGATIONS_HORIZON_DAYS = 45;
const MAX_ITEMS = 6;
const DIVIDER_INSET = spacing.lg + 36 + spacing.md;

const ICONS: Record<Obligation['kind'], IconName> = {
  inspection: 'construct-outline',
  insurance: 'shield-checkmark-outline',
  document: 'document-text-outline',
  subscription: 'repeat',
  efatura: 'receipt-outline',
  irs: 'calculator-outline',
  imi: 'home-outline',
  iuc: 'car-outline',
};

async function loadObligations(repositories: Repositories, today: CalendarDate) {
  const [vehicles, documents, subscriptions, wealth] = [
    await repositories.vehicles.list(),
    await repositories.documents.list(),
    await repositories.subscriptions.list(),
    await repositories.wealth.list(),
  ];
  return upcomingObligations({
    today,
    horizonDays: OBLIGATIONS_HORIZON_DAYS,
    vehicles,
    documents,
    subscriptions,
    hasProperty: wealth.some((item) => item.type === 'property'),
  });
}

/** "Próximos prazos": inspeções, seguros, documentos, cobranças e datas fiscais. */
export function UpcomingObligations({ today }: { today: CalendarDate }) {
  const { t } = useTranslation();
  const { formatDate, formatMoney } = useLocaleFormat();
  const query = useDataQuery(
    useCallback((repositories: Repositories) => loadObligations(repositories, today), [today]),
  );
  if (!query.data) return null;
  const items = query.data.slice(0, MAX_ITEMS);

  const title = (item: Obligation): string => {
    switch (item.kind) {
      case 'inspection':
        return t('obligations.inspection', { name: item.name });
      case 'insurance':
        return t('obligations.insurance', { name: item.name });
      case 'document':
        return t('obligations.document', { name: item.name });
      case 'subscription':
        return t('obligations.subscription', {
          name: item.name,
          amount: formatMoney({ amountMinor: item.amount, currency: item.currency }),
        });
      case 'efatura':
        return t('obligations.efatura');
      case 'irs':
        return t('obligations.irs');
      case 'imi':
        return t(`obligations.imi.${item.installment}`);
      case 'iuc':
        return t(`obligations.iuc.${item.installment}`);
    }
  };

  const when = (item: Obligation): string => {
    const days = obligationDays(item, today);
    const date = formatDate(calendarDateToLocalDate(item.date), 'medium');
    if (days < 0) return t('obligations.overdue', { date });
    if (days === 0) return t('obligations.today');
    return t('obligations.inDays', { count: days, date });
  };

  const open = (item: Obligation): (() => void) | undefined => {
    switch (item.kind) {
      case 'inspection':
      case 'insurance':
        return () => router.push({ pathname: '/vehicles/[id]', params: { id: item.vehicleId } });
      case 'document':
        return () => router.push({ pathname: '/documents/[id]', params: { id: item.documentId } });
      case 'subscription':
        return () =>
          router.push({ pathname: '/subscription/[id]', params: { id: item.subscriptionId } });
      default:
        return undefined;
    }
  };

  return (
    <Section title={t('obligations.title')}>
      <Card padding="xs">
        {items.length === 0 ? (
          <Text variant="callout" tone="secondary" style={{ padding: spacing.lg }}>
            {t('obligations.empty', { days: OBLIGATIONS_HORIZON_DAYS })}
          </Text>
        ) : (
          items.map((item, index) => {
            const overdue = obligationDays(item, today) < 0;
            const onPress = open(item);
            return (
              <Fragment key={`${item.kind}-${item.date}-${index}`}>
                {index > 0 ? <Divider inset={DIVIDER_INSET} /> : null}
                <ListItem
                  icon={ICONS[item.kind]}
                  iconColor={overdue ? 'negative' : 'primaryText'}
                  iconBackground={overdue ? 'negativeMuted' : 'primaryMuted'}
                  title={title(item)}
                  subtitle={when(item)}
                  showChevron={Boolean(onPress)}
                  onPress={onPress}
                />
              </Fragment>
            );
          })
        )}
      </Card>
    </Section>
  );
}
