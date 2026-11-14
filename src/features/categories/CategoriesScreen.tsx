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
  moveItem,
  ReorderableList,
  Screen,
  Section,
  Text,
} from '@/ui/components';
import { useBreakpoint } from '@/ui/layout/useBreakpoint';
import { spacing, useTheme } from '@/ui/theme';
import { useHaptics } from '../preferences';

const DIVIDER_INSET = spacing.lg + 36 + spacing.md;

const loadCategories = (repositories: Repositories) => repositories.categories.listWithUsage();

export function CategoriesScreen() {
  const { t } = useTranslation();
  const haptic = useHaptics();
  const { colors } = useTheme();
  const breakpoint = useBreakpoint();
  const repositories = useRepositories();
  const query = useDataQuery(loadCategories);
  const categories = query.data;
  const [ordering, setOrdering] = useState(false);
  const [failed, setFailed] = useState(false);
  // Ordem mostrada logo ao largar; vale só para a lista em que se baseou (a confirmada substitui-a).
  const [optimistic, setOptimistic] = useState<{
    base: typeof categories;
    order: Partial<Record<CategoryType, string[]>>;
  } | null>(null);

  // Grava a ordem nova; a lista atualiza-se sozinha depois da escrita.
  const save = (type: CategoryType, ids: string[]) => {
    setFailed(false);
    // A nova ordem aparece logo; a lista confirmada substitui-a depois da escrita.
    setOptimistic((current) => ({
      base: categories,
      order: { ...(current && current.base === categories ? current.order : {}), [type]: ids },
    }));
    void repositories.categories.reorder(type, ids).catch(() => setFailed(true));
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
          const pending = optimistic?.base === categories ? optimistic.order[type] : undefined;
          const ofType = categories.filter((category) => category.type === type);
          const items = pending
            ? [...ofType].sort((a, b) => pending.indexOf(a.id) - pending.indexOf(b.id))
            : ofType;
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
                ) : ordering ? (
                  <ReorderableList
                    data={items}
                    keyOf={(category) => category.id}
                    separator={<Divider inset={DIVIDER_INSET} />}
                    handleLabel={(category) => t('categories.drag', { name: category.name })}
                    onReorder={(from, to) => save(type, moveItem(ids, from, to))}
                    onDragStart={() => haptic.impactMedium()}
                    onTargetChange={() => haptic.selection()}
                    moveLabels={(category) => ({
                      up: t('categories.moveUp', { name: category.name }),
                      down: t('categories.moveDown', { name: category.name }),
                    })}
                    renderItem={(category) => (
                      <ListItem
                        leading={<CategoryIcon icon={category.icon} color={category.color} />}
                        title={category.name}
                      />
                    )}
                  />
                ) : (
                  items.map((category, index) => (
                    <Fragment key={category.id}>
                      {index > 0 ? <Divider inset={DIVIDER_INSET} /> : null}
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
