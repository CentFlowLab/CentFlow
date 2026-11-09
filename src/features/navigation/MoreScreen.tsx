import { router, type Href } from 'expo-router';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';

import { Card, Divider, ListItem, Screen, Section } from '@/ui/components';
import { spacing } from '@/ui/theme';

import { hasAreaDescription, MOBILE_SECONDARY_ITEMS, type NavGroup } from './nav-items';

const DIVIDER_INSET = spacing.lg + 36 + spacing.md;

const GROUPS = ['overview', 'planning', 'assets', 'system'] as const satisfies readonly NavGroup[];

export function MoreScreen() {
  const { t } = useTranslation();

  return (
    <Screen title={t('more.title')} subtitle={t('more.subtitle')}>
      {GROUPS.map((group) => {
        const items = MOBILE_SECONDARY_ITEMS.filter((item) => item.group === group);
        if (items.length === 0) return null;
        return (
          <Section key={group} title={t(`nav.groups.${group}`)}>
            <Card padding="xs">
              {items.map((item, index) => (
                <Fragment key={item.key}>
                  {index > 0 ? <Divider inset={DIVIDER_INSET} /> : null}
                  <ListItem
                    title={t(`nav.${item.key}`)}
                    subtitle={
                      hasAreaDescription(item.key)
                        ? t(`modules.${item.key}.description`)
                        : undefined
                    }
                    icon={item.icon}
                    onPress={() => router.navigate(item.href as Href)}
                  />
                </Fragment>
              ))}
            </Card>
          </Section>
        );
      })}
    </Screen>
  );
}
