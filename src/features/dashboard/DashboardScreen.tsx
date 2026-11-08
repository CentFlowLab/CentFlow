import { useTranslation } from 'react-i18next';

import { getDayPart } from '@/core/format';
import { useLocaleFormat } from '@/i18n';
import { Card, EmptyState, Screen } from '@/ui/components';

export function DashboardScreen() {
  const { t } = useTranslation();
  const { formatDate } = useLocaleFormat();
  const now = new Date();

  return (
    <Screen
      title={t(`dashboard.greeting.${getDayPart(now)}`)}
      subtitle={capitalize(formatDate(now, 'long'))}>
      <Card padding="none">
        <EmptyState
          icon="analytics-outline"
          title={t('dashboard.emptyTitle')}
          description={t('dashboard.emptyDescription')}
        />
      </Card>
    </Screen>
  );
}

function capitalize(value: string): string {
  return value.charAt(0).toLocaleUpperCase() + value.slice(1);
}
