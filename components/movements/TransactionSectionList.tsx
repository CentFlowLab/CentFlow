import { memo, useCallback, useMemo } from 'react';
import { SectionList, type SectionListProps, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import type { MerchantGroup } from '@/lib/domain/merchant-group.types';
import type { Transaction } from '@/lib/domain/transaction.types';
import type { TransactionDaySection } from '@/lib/domain/transaction-grouping';
import { getMerchantGroupName } from '@/lib/merchants/transaction-search';
import { colors, spacing } from '@/lib/theme';
import { formatCurrency } from '@/lib/utils/format';

import { SwipeableTransactionListItem } from './SwipeableTransactionListItem';

type TransactionSectionListProps = {
  sections: TransactionDaySection[];
  merchantGroups: MerchantGroup[];
  monthSummaryLabel: string;
  monthSummary: { net: number; count: number };
  showEmptyList: boolean;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  ListEmptyComponent: SectionListProps<Transaction, TransactionDaySection>['ListEmptyComponent'];
  refreshControl: SectionListProps<Transaction, TransactionDaySection>['refreshControl'];
  contentContainerStyle: SectionListProps<Transaction, TransactionDaySection>['contentContainerStyle'];
};

type RowProps = {
  transaction: Transaction;
  merchantGroupName?: string;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
};

const TransactionRow = memo(function TransactionRow({
  transaction,
  merchantGroupName,
  onEdit,
  onDelete,
}: RowProps) {
  return (
    <SwipeableTransactionListItem
      transaction={transaction}
      merchantGroupName={merchantGroupName}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );
});

const SectionHeader = memo(function SectionHeader({
  title,
  dayTotal,
}: {
  title: string;
  dayTotal: number;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text variant="label" color="textSecondary">
        {title}
      </Text>
      <Text variant="caption" color={dayTotal >= 0 ? 'success' : 'textMuted'}>
        {dayTotal > 0 ? '+' : ''}
        {formatCurrency(dayTotal)}
      </Text>
    </View>
  );
});

const MonthSummaryHeader = memo(function MonthSummaryHeader({
  label,
  net,
  count,
}: {
  label: string;
  net: number;
  count: number;
}) {
  return (
    <View style={styles.monthSummary}>
      <Text variant="caption" color="textMuted">
        {label}
      </Text>
      <View style={styles.monthSummaryRow}>
        <Text variant="bodyMedium" color={net >= 0 ? 'success' : 'text'}>
          {net > 0 ? '+' : ''}
          {formatCurrency(net)}
        </Text>
        <Text variant="caption" color="textMuted">
          {count} movimento{count === 1 ? '' : 's'}
        </Text>
      </View>
    </View>
  );
});

export const TransactionSectionList = memo(function TransactionSectionList({
  sections,
  merchantGroups,
  monthSummaryLabel,
  monthSummary,
  showEmptyList,
  onEdit,
  onDelete,
  ListEmptyComponent,
  refreshControl,
  contentContainerStyle,
}: TransactionSectionListProps) {
  const merchantGroupNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const group of merchantGroups) {
      map.set(group.id, group.name);
    }
    return map;
  }, [merchantGroups]);

  const keyExtractor = useCallback((item: Transaction) => item.id, []);

  const renderItem = useCallback(
    ({ item }: { item: Transaction }) => (
      <TransactionRow
        transaction={item}
        merchantGroupName={
          item.merchantGroupId
            ? merchantGroupNames.get(item.merchantGroupId) ??
              getMerchantGroupName(item.merchantGroupId, merchantGroups)
            : undefined
        }
        onEdit={onEdit}
        onDelete={onDelete}
      />
    ),
    [merchantGroupNames, merchantGroups, onDelete, onEdit],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: TransactionDaySection }) => (
      <SectionHeader title={section.title} dayTotal={section.dayTotal} />
    ),
    [],
  );

  const listHeader = useMemo(
    () =>
      showEmptyList ? null : (
        <MonthSummaryHeader
          label={monthSummaryLabel}
          net={monthSummary.net}
          count={monthSummary.count}
        />
      ),
    [monthSummary.count, monthSummary.net, monthSummaryLabel, showEmptyList],
  );

  return (
    <SectionList
      sections={sections}
      keyExtractor={keyExtractor}
      stickySectionHeadersEnabled={false}
      renderItem={renderItem}
      renderSectionHeader={renderSectionHeader}
      ListHeaderComponent={listHeader}
      contentContainerStyle={contentContainerStyle}
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
      ListEmptyComponent={ListEmptyComponent}
      initialNumToRender={12}
      maxToRenderPerBatch={8}
      windowSize={7}
      removeClippedSubviews
    />
  );
});

const styles = StyleSheet.create({
  monthSummary: {
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
  },
  monthSummaryRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
});
