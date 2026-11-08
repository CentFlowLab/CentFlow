import { router } from 'expo-router';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { PERIOD_PRESETS, presetRange, type EntryType, type PeriodPreset } from '@/core/finance';
import { useDataQuery, type EntryFilter, type EntrySort, type Repositories } from '@/data';
import {
  Button,
  Card,
  Chip,
  ChipGroup,
  Divider,
  EmptyState,
  IconButton,
  Screen,
  SegmentedControl,
  Text,
  TextField,
} from '@/ui/components';
import { useBreakpoint } from '@/ui/layout/useBreakpoint';
import { spacing, useTheme } from '@/ui/theme';

import { NEW_TRANSACTION_HREF } from '../navigation/nav-items';
import { EntryListItem } from '../finance/EntryListItem';
import { useFinanceLookups } from '../finance/useFinanceLookups';
import { useToday } from '../finance/useToday';

const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 250;
const DIVIDER_INSET = spacing.lg + 36 + spacing.md;

type TypeFilter = 'all' | EntryType;

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function EntriesScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const breakpoint = useBreakpoint();
  const today = useToday();
  const lookups = useFinanceLookups();

  const [search, setSearch] = useState('');
  const [type, setType] = useState<TypeFilter>('all');
  const [period, setPeriod] = useState<PeriodPreset>('all');
  const [accountId, setAccountId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [sort, setSort] = useState<EntrySort>('dateDesc');
  const [showFilters, setShowFilters] = useState(false);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const debouncedSearch = useDebounced(search, SEARCH_DEBOUNCE_MS);

  const filter = useMemo<EntryFilter>(
    () => ({
      search: debouncedSearch,
      type: type === 'all' ? undefined : type,
      accountId: accountId ?? undefined,
      categoryId: categoryId ?? undefined,
      ...presetRange(period, today),
      sort,
      limit,
    }),
    [debouncedSearch, type, accountId, categoryId, period, today, sort, limit],
  );

  const page = useDataQuery(
    useCallback((repositories: Repositories) => repositories.entries.list(filter), [filter]),
  );

  const resetPaging = () => setLimit(PAGE_SIZE);
  const advancedCount = (accountId ? 1 : 0) + (categoryId ? 1 : 0) + (sort !== 'dateDesc' ? 1 : 0);
  const hasFilters =
    Boolean(debouncedSearch) || type !== 'all' || period !== 'all' || advancedCount > 0;

  const clearFilters = () => {
    setSearch('');
    setType('all');
    setPeriod('all');
    setAccountId(null);
    setCategoryId(null);
    setSort('dateDesc');
    resetPaging();
  };

  const categoryChoices = (lookups.data?.categoryList ?? []).filter(
    (category) => type === 'all' || category.type === type,
  );

  const headerRight =
    breakpoint === 'compact' ? (
      <IconButton
        icon="add"
        variant="filled"
        color="primaryText"
        accessibilityLabel={t('entries.add')}
        onPress={() => router.push(NEW_TRANSACTION_HREF)}
      />
    ) : (
      <Button
        label={t('entries.add')}
        icon="add"
        onPress={() => router.push(NEW_TRANSACTION_HREF)}
      />
    );

  const items = page.data?.items ?? [];
  const total = page.data?.total ?? 0;

  return (
    <Screen title={t('entries.title')} headerRight={headerRight}>
      <View style={styles.filters}>
        <TextField
          label={t('entries.searchLabel')}
          value={search}
          onChangeText={(text) => {
            setSearch(text);
            resetPaging();
          }}
          placeholder={t('entries.searchPlaceholder')}
          returnKeyType="search"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        <SegmentedControl
          accessibilityLabel={t('entries.filterType')}
          value={type}
          onChange={(value) => {
            setType(value);
            if (
              categoryId &&
              value !== 'all' &&
              lookups.data?.categories.get(categoryId)?.type !== value
            ) {
              setCategoryId(null);
            }
            resetPaging();
          }}
          options={[
            { value: 'all', label: t('common.all') },
            { value: 'expense', label: t('entryTypes.expense') },
            { value: 'income', label: t('entryTypes.income') },
            { value: 'transfer', label: t('entryTypes.transfer') },
          ]}
        />
        <ChipGroup label={t('entries.filterPeriod')} hideLabel>
          {PERIOD_PRESETS.map((preset) => (
            <Chip
              key={preset}
              label={t(`entries.periods.${preset}`)}
              selected={period === preset}
              onPress={() => {
                setPeriod(preset);
                resetPaging();
              }}
            />
          ))}
        </ChipGroup>

        <View style={styles.filterBar}>
          <Button
            label={
              advancedCount > 0
                ? `${t('entries.filters')} (${advancedCount})`
                : t('entries.filters')
            }
            variant="secondary"
            size="sm"
            icon={showFilters ? 'chevron-up' : 'options-outline'}
            onPress={() => setShowFilters((value) => !value)}
            accessibilityState={{ expanded: showFilters }}
          />
          {hasFilters ? (
            <Button
              label={t('entries.clearFilters')}
              variant="ghost"
              size="sm"
              onPress={clearFilters}
            />
          ) : null}
        </View>

        {showFilters ? (
          <Card style={styles.advanced}>
            <ChipGroup label={t('entries.filterAccount')}>
              <Chip
                label={t('entries.allAccounts')}
                selected={accountId === null}
                onPress={() => {
                  setAccountId(null);
                  resetPaging();
                }}
              />
              {(lookups.data?.accountList ?? []).map((account) => (
                <Chip
                  key={account.id}
                  label={account.name}
                  selected={accountId === account.id}
                  onPress={() => {
                    setAccountId(account.id);
                    resetPaging();
                  }}
                />
              ))}
            </ChipGroup>
            {type !== 'transfer' ? (
              <ChipGroup label={t('entries.filterCategory')}>
                <Chip
                  label={t('entries.allCategories')}
                  selected={categoryId === null}
                  onPress={() => {
                    setCategoryId(null);
                    resetPaging();
                  }}
                />
                {categoryChoices.map((category) => (
                  <Chip
                    key={category.id}
                    label={category.name}
                    selected={categoryId === category.id}
                    onPress={() => {
                      setCategoryId(category.id);
                      resetPaging();
                    }}
                  />
                ))}
              </ChipGroup>
            ) : null}
            <ChipGroup label={t('entries.sort')}>
              <Chip
                label={t('entries.sortNewest')}
                selected={sort === 'dateDesc'}
                onPress={() => setSort('dateDesc')}
              />
              <Chip
                label={t('entries.sortOldest')}
                selected={sort === 'dateAsc'}
                onPress={() => setSort('dateAsc')}
              />
            </ChipGroup>
          </Card>
        ) : null}
      </View>

      {page.status === 'error' && !page.data ? (
        <Card padding="none">
          <EmptyState icon="alert-circle-outline" title={t('errors.loadFailed')} />
        </Card>
      ) : !page.data || !lookups.data ? (
        <ActivityIndicator color={colors.primary} style={styles.loading} />
      ) : items.length === 0 ? (
        <Card padding="none">
          {hasFilters ? (
            <EmptyState
              icon="search-outline"
              title={t('entries.noResultsTitle')}
              description={t('entries.noResultsDescription')}
            />
          ) : (
            <EmptyState
              icon="swap-vertical-outline"
              title={t('entries.emptyTitle')}
              description={t('entries.emptyDescription')}>
              <Button
                label={t('entries.add')}
                icon="add"
                onPress={() => router.push(NEW_TRANSACTION_HREF)}
              />
            </EmptyState>
          )}
        </Card>
      ) : (
        <View style={styles.results}>
          <Text variant="footnote" tone="secondary" accessibilityLiveRegion="polite">
            {t('entries.resultCount', { count: total })}
          </Text>
          <Card padding="xs">
            {items.map((entry, index) => (
              <Fragment key={entry.id}>
                {index > 0 ? <Divider inset={DIVIDER_INSET} /> : null}
                <EntryListItem
                  entry={entry}
                  lookups={lookups.data!}
                  onPress={() => router.push({ pathname: '/entry/[id]', params: { id: entry.id } })}
                />
              </Fragment>
            ))}
          </Card>
          {items.length < total ? (
            <Button
              label={t('entries.loadMore')}
              variant="secondary"
              onPress={() => setLimit((value) => value + PAGE_SIZE)}
            />
          ) : null}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: {
    gap: spacing.md,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  advanced: {
    gap: spacing.lg,
  },
  results: {
    gap: spacing.sm,
  },
  loading: {
    paddingVertical: spacing['4xl'],
  },
});
