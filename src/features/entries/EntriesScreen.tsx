import { router } from 'expo-router';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import {
  PERIOD_PRESETS,
  addDays,
  calendarDateToLocalDate,
  presetRange,
  type CalendarDate,
  type EntryType,
  type PeriodPreset,
} from '@/core/finance';
import {
  useDataQuery,
  useRepositories,
  type EntryFilter,
  type EntrySort,
  type Repositories,
} from '@/data';
import { useLocaleFormat } from '@/i18n';
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
  Snackbar,
  SwipeableRow,
  Text,
  TextField,
} from '@/ui/components';
import { useBreakpoint } from '@/ui/layout/useBreakpoint';
import { spacing, useTheme } from '@/ui/theme';

import { NEW_TRANSACTION_HREF } from '../navigation/nav-items';
import { EntryListItem } from '../finance/EntryListItem';
import { useFinanceLookups } from '../finance/useFinanceLookups';
import { useToday } from '../finance/useToday';

function dateHeading(
  date: CalendarDate,
  today: CalendarDate,
  formatDate: (value: Date, style: 'medium') => string,
  t: (key: 'common.today' | 'common.yesterday') => string,
): string {
  if (date === today) return t('common.today');
  if (date === addDays(today, -1)) return t('common.yesterday');
  return formatDate(calendarDateToLocalDate(date), 'medium');
}

/** Agrupa movimentos consecutivos do mesmo dia (a lista já vem ordenada por data). */
function groupByDay<T extends { id: string; date: CalendarDate }>(
  items: readonly T[],
): { date: CalendarDate; entries: T[] }[] {
  const groups: { date: CalendarDate; entries: T[] }[] = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (last && last.date === item.date) last.entries.push(item);
    else groups.push({ date: item.date, entries: [item] });
  }
  return groups;
}

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

/** Quanto tempo fica o "Anular" antes de eliminar de facto. */
const UNDO_MS = 5000;

/**
 * Eliminação com "Anular": o movimento sai da lista logo, mas só é eliminado na base de dados
 * passado `UNDO_MS` (ou ao sair do ecrã). Anular não precisa de desfazer nada já sincronizado.
 */
function useUndoableDelete() {
  const repositories = useRepositories();
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const [last, setLast] = useState<string | null>(null);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const commit = useCallback(
    (id: string) => {
      timers.current.delete(id);
      void repositories.entries.delete(id).catch(() => {
        console.error('[entries] swipe_delete_failed');
        setHidden((current) => {
          const next = new Set(current);
          next.delete(id);
          return next;
        });
      });
      setLast((current) => (current === id ? null : current));
    },
    [repositories],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => {
      // Sair do ecrã confirma o que estava à espera.
      for (const [id, timer] of pending) {
        clearTimeout(timer);
        void repositories.entries.delete(id).catch(() => {
          console.error('[entries] swipe_delete_failed');
        });
      }
      pending.clear();
    };
  }, [repositories]);

  return {
    hidden,
    last,
    remove(id: string) {
      setHidden((current) => new Set(current).add(id));
      setLast(id);
      timers.current.set(
        id,
        setTimeout(() => commit(id), UNDO_MS),
      );
    },
    undo() {
      if (!last) return;
      clearTimeout(timers.current.get(last));
      timers.current.delete(last);
      setHidden((current) => {
        const next = new Set(current);
        next.delete(last);
        return next;
      });
      setLast(null);
    },
  };
}

export function EntriesScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const breakpoint = useBreakpoint();
  const { formatDate } = useLocaleFormat();
  const today = useToday();
  const lookups = useFinanceLookups();
  const deletion = useUndoableDelete();

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
  const activeFilterCount =
    (type !== 'all' ? 1 : 0) +
    (period !== 'all' ? 1 : 0) +
    (accountId ? 1 : 0) +
    (categoryId ? 1 : 0) +
    (sort !== 'dateDesc' ? 1 : 0);
  const hasFilters = Boolean(debouncedSearch) || activeFilterCount > 0;

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

  const items = (page.data?.items ?? []).filter((entry) => !deletion.hidden.has(entry.id));
  const total = Math.max((page.data?.total ?? 0) - deletion.hidden.size, 0);

  return (
    <View style={styles.root}>
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
          <View style={styles.filterBar}>
            <Button
              label={
                activeFilterCount > 0
                  ? `${t('entries.filters')} (${activeFilterCount})`
                  : t('entries.filters')
              }
              variant="secondary"
              icon={showFilters ? 'chevron-up' : 'options-outline'}
              onPress={() => setShowFilters((value) => !value)}
              accessibilityState={{ expanded: showFilters }}
            />
            <Button
              label={t('entries.import')}
              variant="ghost"
              icon="document-text-outline"
              onPress={() => router.push('/import-statement')}
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
            {groupByDay(items).map((group) => (
              <View key={group.date} style={styles.dayGroup}>
                <Text
                  variant="overline"
                  tone="secondary"
                  accessibilityRole="header"
                  style={styles.day}>
                  {dateHeading(group.date, today, formatDate, t)}
                </Text>
                <Card padding="xs">
                  {group.entries.map((entry, index) => (
                    <Fragment key={entry.id}>
                      {index > 0 ? <Divider inset={DIVIDER_INSET} /> : null}
                      <SwipeableRow
                        actions={[
                          {
                            label: t('entries.delete'),
                            icon: 'trash-outline',
                            tone: 'negative',
                            onPress: () => deletion.remove(entry.id),
                          },
                        ]}>
                        <EntryListItem
                          entry={entry}
                          lookups={lookups.data!}
                          onPress={() =>
                            router.push({ pathname: '/entry/[id]', params: { id: entry.id } })
                          }
                        />
                      </SwipeableRow>
                    </Fragment>
                  ))}
                </Card>
              </View>
            ))}
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
      {deletion.last ? (
        <Snackbar
          message={t('entries.deleted')}
          actionLabel={t('entries.undo')}
          onAction={deletion.undo}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  filters: {
    gap: spacing.md,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  advanced: {
    gap: spacing.lg,
  },
  results: {
    gap: spacing.lg,
  },
  dayGroup: {
    gap: spacing.sm,
  },
  day: {
    paddingHorizontal: spacing.xs,
  },
  loading: {
    paddingVertical: spacing['4xl'],
  },
});
