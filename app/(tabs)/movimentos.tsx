import { SymbolView } from 'expo-symbols';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader, SegmentedControl } from '@/components/layout';
import {
  AddTransactionModal,
  EditTransactionModal,
  ImportCsvModal,
  SwipeableTransactionListItem,
  TransactionsSkeleton,
} from '@/components/movements';
import { EmptyState, ErrorState, RefetchingIndicator } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import {
  useDeleteTransaction,
  useTransactions,
} from '@/hooks/queries/useTransactions';
import type { Transaction, TransactionFilter } from '@/lib/domain/transaction.types';
import { colors, spacing } from '@/lib/theme';

const FILTER_SEGMENTS = [
  { key: 'all' as const, label: 'Todos' },
  { key: 'expense' as const, label: 'Despesas' },
  { key: 'income' as const, label: 'Receitas' },
];

export default function MovimentosScreen() {
  const insets = useSafeAreaInsets();
  const { action } = useLocalSearchParams<{ action?: string }>();
  const handledAction = useRef(false);
  const [filter, setFilter] = useState<TransactionFilter>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [csvModalVisible, setCsvModalVisible] = useState(false);
  const [startWithReceiptPicker, setStartWithReceiptPicker] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const { data, isLoading, isError, error, refetch, isRefetching } =
    useTransactions(filter);
  const deleteMutation = useDeleteTransaction();
  const { showToast } = useToast();

  const transactions = useMemo(() => data ?? [], [data]);
  const isEmpty = !isLoading && !isError && transactions.length === 0;

  function openAddModal(withReceipt = false) {
    setStartWithReceiptPicker(withReceipt);
    setModalVisible(true);
  }

  function closeAddModal() {
    setModalVisible(false);
    setStartWithReceiptPicker(false);
  }

  useEffect(() => {
    if (handledAction.current || action !== 'receipt') return;
    handledAction.current = true;
    openAddModal(true);
    showToast('Digitaliza o teu primeiro talão!', 'info');
  }, [action, showToast]);

  function handleEdit(transaction: Transaction) {
    setEditingTransaction(transaction);
  }

  function handleDelete(transaction: Transaction) {
    deleteMutation.mutate(transaction.id, {
      onSuccess: () => {
        showToast('Movimento eliminado.', 'success');
      },
      onError: () => {
        showToast('Não foi possível eliminar o movimento.', 'error');
      },
    });
  }

  return (
    <View style={styles.screen}>
      <AppHeader
        secondaryAction={{
          icon: (
            <SymbolView
              name={{
                ios: 'square.and.arrow.down',
                android: 'upload_file',
                web: 'upload_file',
              }}
              tintColor={colors.primary}
              size={20}
            />
          ),
          onPress: () => setCsvModalVisible(true),
          accessibilityLabel: 'Importar CSV',
        }}
        action={{
          icon: (
            <SymbolView
              name={{ ios: 'plus', android: 'add', web: 'add' }}
              tintColor={colors.primary}
              size={22}
            />
          ),
          onPress: () => openAddModal(false),
          accessibilityLabel: 'Adicionar movimento',
        }}
      />

      <View style={styles.filters}>
        <SegmentedControl
          segments={FILTER_SEGMENTS}
          value={filter}
          onChange={setFilter}
        />
      </View>

      {isLoading ? (
        <View style={styles.listPadding}>
          <TransactionsSkeleton />
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <ErrorState
            context="movements"
            error={error}
            onRetry={() => refetch()}
            retryLoading={isRefetching}
          />
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <SwipeableTransactionListItem
              transaction={item}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
          contentContainerStyle={[
            styles.listContent,
            isEmpty && styles.listContentEmpty,
            { paddingBottom: Math.max(insets.bottom, spacing.lg) },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={
                <SymbolView
                  name={{
                    ios: 'list.bullet.rectangle',
                    android: 'receipt_long',
                    web: 'receipt_long',
                  }}
                  tintColor={colors.primary}
                  size={32}
                />
              }
              title="Ainda sem movimentos"
              description={
                filter === 'all'
                  ? 'Adiciona a primeira transação ou digitaliza um talão para começares a ter histórico completo.'
                  : filter === 'expense'
                    ? 'Não tens despesas registadas neste filtro.'
                    : 'Não tens receitas registadas neste filtro.'
              }
              actionLabel="Nova transação"
              onAction={() => openAddModal(false)}
              secondaryActionLabel="Digitalizar talão"
              onSecondaryAction={() => openAddModal(true)}
            />
          }
        />
      )}

      <AddTransactionModal
        visible={modalVisible}
        onClose={closeAddModal}
        startWithReceiptPicker={startWithReceiptPicker}
      />

      <ImportCsvModal
        visible={csvModalVisible}
        onClose={() => setCsvModalVisible(false)}
      />

      <EditTransactionModal
        visible={editingTransaction !== null}
        transaction={editingTransaction}
        onClose={() => setEditingTransaction(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  filters: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  listPadding: {
    paddingHorizontal: spacing.lg,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    flexGrow: 1,
  },
  listContentEmpty: {
    flex: 1,
    justifyContent: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
});
