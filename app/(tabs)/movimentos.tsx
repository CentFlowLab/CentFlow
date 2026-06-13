import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader, SegmentedControl } from '@/components/layout';
import {
  AddTransactionModal,
  EditTransactionModal,
  ImportCsvModal,
  SwipeableTransactionListItem,
  TransactionsSkeleton,
} from '@/components/movements';
import { EmptyState, Text } from '@/components/ui';
import {
  useDeleteTransaction,
  useTransactions,
} from '@/hooks/queries/useTransactions';
import { getApiErrorMessage } from '@/lib/api/errors';
import type { Transaction, TransactionFilter } from '@/lib/domain/transaction.types';
import { colors, radius, spacing } from '@/lib/theme';

const FILTER_SEGMENTS = [
  { key: 'all' as const, label: 'Todos' },
  { key: 'expense' as const, label: 'Despesas' },
  { key: 'income' as const, label: 'Receitas' },
];

export default function MovimentosScreen() {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<TransactionFilter>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [csvModalVisible, setCsvModalVisible] = useState(false);
  const [startWithReceiptPicker, setStartWithReceiptPicker] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const { data, isLoading, isError, error, refetch, isRefetching } =
    useTransactions(filter);
  const deleteMutation = useDeleteTransaction();

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

  function handleEdit(transaction: Transaction) {
    setEditingTransaction(transaction);
  }

  function handleDelete(transaction: Transaction) {
    deleteMutation.mutate(transaction.id);
  }

  return (
    <View style={styles.screen}>
      <AppHeader
        title="Movimentos"
        subtitle="Transações e talões num só lugar"
        showAvatar={false}
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
        <Pressable
          onPress={() => setCsvModalVisible(true)}
          style={({ pressed }) => [styles.importButton, pressed && styles.importButtonPressed]}
          accessibilityRole="button"
          accessibilityLabel="Importar CSV">
          <SymbolView
            name={{ ios: 'square.and.arrow.down', android: 'upload_file', web: 'upload_file' }}
            tintColor={colors.primary}
            size={18}
          />
          <Text variant="bodyMedium" color="primary">
            Importar CSV
          </Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.listPadding}>
          <TransactionsSkeleton />
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <EmptyState
            icon={
              <SymbolView
                name={{
                  ios: 'exclamationmark.triangle',
                  android: 'warning',
                  web: 'warning',
                }}
                tintColor={colors.danger}
                size={32}
              />
            }
            title="Não foi possível carregar"
            description={getApiErrorMessage(error, 'os movimentos')}
            actionLabel="Tentar novamente"
            onAction={() => refetch()}
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
          ListFooterComponent={
            isRefetching && transactions.length > 0 ? (
              <Text variant="caption" color="textMuted" align="center" style={styles.refetching}>
                A atualizar...
              </Text>
            ) : null
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
    gap: spacing.md,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  importButtonPressed: {
    opacity: 0.85,
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
  refetching: {
    paddingVertical: spacing.md,
  },
});
