import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button, Card, EmptyState, Screen } from '@/ui/components';

export function NotFoundScreen() {
  const { t } = useTranslation();
  return (
    <Screen>
      <Card padding="none">
        <EmptyState
          icon="compass-outline"
          title={t('notFound.title')}
          description={t('notFound.description')}>
          <Button label={t('notFound.goHome')} onPress={() => router.replace('/')} />
        </EmptyState>
      </Card>
    </Screen>
  );
}
