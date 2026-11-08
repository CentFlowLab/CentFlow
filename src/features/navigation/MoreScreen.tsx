import { router, type Href } from 'expo-router';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';

import { Card, Divider, ListItem, Screen } from '@/ui/components';
import { spacing } from '@/ui/theme';

import { isPlannedModule, MOBILE_SECONDARY_ITEMS } from './nav-items';

const DIVIDER_INSET = spacing.lg + 36 + spacing.md;

export function MoreScreen() {
  const { t } = useTranslation();

  return (
    <Screen title={t('more.title')} subtitle={t('more.subtitle')}>
      <Card padding="xs">
        {MOBILE_SECONDARY_ITEMS.map((item, index) => (
          <Fragment key={item.key}>
            {index > 0 ? <Divider inset={DIVIDER_INSET} /> : null}
            <ListItem
              title={t(`nav.${item.key}`)}
              subtitle={
                isPlannedModule(item.key) ? t(`modules.${item.key}.description`) : undefined
              }
              icon={item.icon}
              onPress={() => router.navigate(item.href as Href)}
            />
          </Fragment>
        ))}
      </Card>
    </Screen>
  );
}
