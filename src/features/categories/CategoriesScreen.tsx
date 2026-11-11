import { router } from 'expo-router';
import { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { CATEGORY_TYPES, type CategoryType } from '@/core/finance';
import { useDataQuery, useRepositories, type Repositories } from '@/data';
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
  const repositories = useRepositories();
  const query = useDataQuery(loadCategories);
  const categories = query.data;
  const [ordering, setOrdering] = useState(false);
  const [failed, setFailed] = useState(false);

  // Grava a ordem nova; a lista atualiza-se sozinha depois da escrita.
  const save = (type: CategoryType, ids: string[]) => {
    setFailed(false);
    void repositories.categories.reorder(type, ids).catch(() => setFailed(true));
  };
  const move = (type: CategoryType, ids: string[], index: number, delta: -1 | 1) => {
    const next = [...ids];
    const [moved] = next.splice(index, 1);
    if (moved === undefined) return;
    next.splice(index + delta, 0, moved);
    save(type, next);
  };

  const add = () => router.push('/category/new');
  const toggle = (
    <Button
      label={ordering ? t('categories.orderDone') : t('categories.order')}
      icon={ordering ? 'checkmark' : 'swap-vertical-outline'}
      variant={ordering ? 'primary' : 'secondary'}
      onPress={() => setOrdering((current) => !current)}
    />
  );
  const headerRight = (
    <View style={styles.header}>
      {toggle}
      {ordering ? null : breakpoint === 'compact' ? (
        <IconButton
          icon="add"
          variant="filled"
          color="primaryText"
          accessibilityLabel={t('categories.add')}
          onPress={add}
        />
      ) : (
        <Button label={t('categories.add')} icon="add" onPress={add} />
      )}
    </View>
  );

  return (
    <Screen
      title={t('categories.title')}
      subtitle={t('modules.categories.description')}
      headerRight={headerRight}>
      {failed ? (
        <Text variant="footnote" tone="negative" accessibilityLiveRegion="polite">
          {t('errors.saveFailed')}
        </Text>
      ) : null}
      {!categories ? (
        query.status === 'error' ? (
          <EmptyState icon="alert-circle-outline" title={t('errors.loadFailed')} />
        ) : (
          <ActivityIndicator color={colors.primary} />
        )
      ) : (
        CATEGORY_TYPES.map((type) => {
          const items = categories.filter((category) => category.type === type);
          const ids = items.map((category) => category.id);
          return (
            <Section
              key={type}
              title={t(
                type === 'expense' ? 'categories.expenseSection' : 'categories.incomeSection',
              )}>
              {ordering && items.length > 1 ? (
                <View style={styles.tools}>
                  <Text variant="footnote" tone="secondary" style={styles.flex}>
                    {t('categories.orderHint')}
                  </Text>
                  <Button
                    label={t('categories.orderByName')}
                    variant="ghost"
                    icon="text-outline"
                    onPress={() =>
                      save(
                        type,
                        [...items]
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map((category) => category.id),
                      )
                    }
                  />
                </View>
              ) : null}
              <Card padding="xs">
                {items.length === 0 ? (
                  <Text variant="footnote" tone="secondary" style={{ padding: spacing.lg }}>
                    {t('categories.empty')}
                  </Text>
                ) : (
                  items.map((category, index) => (
                    <Fragment key={category.id}>
                      {index > 0 ? <Divider inset={DIVIDER_INSET} /> : null}
                      {ordering ? (
                        <ListItem
                          leading={<CategoryIcon icon={category.icon} color={category.color} />}
                          title={category.name}
                          trailing={
                            <View style={styles.arrows}>
                              <IconButton
                                icon="chevron-up"
                                accessibilityLabel={t('categories.moveUp', {
                                  name: category.name,
                                })}
                                disabled={index === 0}
                                color={index === 0 ? 'textTertiary' : 'text'}
                                onPress={() => move(type, ids, index, -1)}
                              />
                              <IconButton
                                icon="chevron-down"
                                accessibilityLabel={t('categories.moveDown', {
                                  name: category.name,
                                })}
                                disabled={index === items.length - 1}
                                color={index === items.length - 1 ? 'textTertiary' : 'text'}
                                onPress={() => move(type, ids, index, 1)}
                              />
                            </View>
                          }
                        />
                      ) : (
                        <ListItem
                          leading={<CategoryIcon icon={category.icon} color={category.color} />}
                          title={category.name}
                          subtitle={t('categories.entryCount', { count: category.entryCount })}
                          onPress={() =>
                            router.push({
                              pathname: '/category/[id]',
                              params: { id: category.id },
                            })
                          }
                        />
                      )}
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

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tools: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingBottom: spacing.sm },
  flex: { flex: 1 },
  arrows: { flexDirection: 'row', alignItems: 'center' },
});
