import { router } from 'expo-router';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator } from 'react-native';

import { CATEGORY_TYPES } from '@/core/finance';
import { useDataQuery, type Repositories } from '@/data';
import {
  Button,
  Card,
  CategoryIcon,
  Divider,
  EmptyState,
  IconButton,
  ListItem,
  Screen,
  Section,
  Text,
} from '@/ui/components';
import { useBreakpoint } from '@/ui/layout/useBreakpoint';
import { spacing, useTheme } from '@/ui/theme';

const DIVIDER_INSET = spacing.lg + 36 + spacing.md;

const loadCategories = (repositories: Repositories) => repositories.categories.listWithUsage();

export function CategoriesScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const breakpoint = useBreakpoint();
  const query = useDataQuery(loadCategories);
  const categories = query.data;

  const add = () => router.push('/category/new');
  const headerRight =
    breakpoint === 'compact' ? (
      <IconButton
        icon="add"
        variant="filled"
        color="primaryText"
        accessibilityLabel={t('categories.add')}
        onPress={add}
      />
    ) : (
      <Button label={t('categories.add')} icon="add" onPress={add} />
    );

  return (
    <Screen
      title={t('categories.title')}
      subtitle={t('modules.categories.description')}
      headerRight={headerRight}>
      {!categories ? (
        query.status === 'error' ? (
          <EmptyState icon="alert-circle-outline" title={t('errors.loadFailed')} />
        ) : (
          <ActivityIndicator color={colors.primary} />
        )
      ) : (
        CATEGORY_TYPES.map((type) => {
          const items = categories.filter((category) => category.type === type);
          return (
            <Section
              key={type}
              title={t(
                type === 'expense' ? 'categories.expenseSection' : 'categories.incomeSection',
              )}>
              <Card padding="xs">
                {items.length === 0 ? (
                  <Text variant="footnote" tone="secondary" style={{ padding: spacing.lg }}>
                    {t('categories.empty')}
                  </Text>
                ) : (
                  items.map((category, index) => (
                    <Fragment key={category.id}>
                      {index > 0 ? <Divider inset={DIVIDER_INSET} /> : null}
                      <ListItem
                        leading={<CategoryIcon icon={category.icon} color={category.color} />}
                        title={category.name}
                        subtitle={t('categories.entryCount', { count: category.entryCount })}
                        onPress={() =>
                          router.push({ pathname: '/category/[id]', params: { id: category.id } })
                        }
                      />
                    </Fragment>
                  ))
                )}
              </Card>
            </Section>
          );
        })
      )}
    </Screen>
  );
}
