import { SymbolView } from 'expo-symbols';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SubscriptionFormModal, SubscriptionsSection } from '@/components/assets';
import { FeatureAreaGate } from '@/components/features';
import { AppHeader, QuickAddMenuSheet, SegmentedControl } from '@/components/layout';
import {
  AddTransactionModal,
  EditTransactionModal,
  MOVEMENTS_VIEW_SEGMENTS,
  MOVEMENTS_EMPTY_CONFIG,
  PendingSubscriptionModal,
  SwipeableTransactionListItem,
  TransactionsSkeleton,
} from '@/components/movements';
import { EmptyState, ErrorState } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import {
  useDeleteSubscription,
  useLiabilities,
  useSaveSubscription,
} from '@/hooks/queries/useLiabilities';
import {
  useDeleteTransaction,
  useTransactions,
} from '@/hooks/queries/useTransactions';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useSubscriptionDetection } from '@/hooks/useSubscriptionDetection';
import { useQuickAddActions } from '@/hooks/useQuickAddActions';
import type { MovementsView, Subscription } from '@/lib/domain/assets.types';
import type { Transaction, TransactionFilter } from '@/lib/domain/transaction.types';
import { colors, spacing } from '@/lib/theme';

const FILTER_SEGMENTS = [
  { key: 'expense' as const, label: 'Despesas' },
  { key: 'income' as const, label: 'Receitas' },
  { key: 'all' as const, label: 'Todos' },
];

export default function MovimentosScreen() {
  const insets = useSafeAreaInsets();
  const { action, view } = useLocalSearchParams<{ action?: string; view?: string }>();
  const handledAction = useRef(false);
  const handledRouteAction = useRef<string | null>(null);
  const suppressDetectionRef = useRef(false);
  const [activeView, setActiveView] = useState<MovementsView>('movimentos');
  const [filter, setFilter] = useState<TransactionFilter>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [startWithReceiptPicker, setStartWithReceiptPicker] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [subscriptionFormVisible, setSubscriptionFormVisible] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [quickAddVisible, setQuickAddVisible] = useState(false);

  const { data, isLoading, isError, error, refetch, isRefetching } =
    useTransactions(filter);
  const { refreshing, onRefresh } = usePullToRefresh(refetch);
  const deleteMutation = useDeleteTransaction();
  const { showToast } = useToast();

  const {
    data: liabilities,
    refetch: refetchLiabilities,
    isRefetching: isRefetchingLiabilities,
  } = useLiabilities();
  const deleteSubscription = useDeleteSubscription();
  const saveSubscription = useSaveSubscription();
  const {
    activeDetection,
    dismissCurrent,
    markCurrentConfirmed,
  } = useSubscriptionDetection();

  const subscriptions = liabilities?.subscriptions ?? [];
  const transactions = useMemo(() => data ?? [], [data]);
  const isEmpty = !isLoading && !isError && transactions.length === 0;

  useEffect(() => {
    if (view === 'creditos') {
      router.replace('/(tabs)/precos');
      return;
    }
    if (view === 'subscricoes' || view === 'movimentos') {
      setActiveView(view);
    }
  }, [view]);

  function openAddModal(withReceipt = false) {
    setStartWithReceiptPicker(withReceipt);
    setModalVisible(true);
  }

  function closeAddModal() {
    setModalVisible(false);
    setStartWithReceiptPicker(false);
  }

  function closeSubscriptionForm() {
    setSubscriptionFormVisible(false);
    setEditingSubscription(null);
    suppressDetectionRef.current = false;
  }

  const openSubscriptionForm = useCallback((subscription: Subscription | null = null) => {
    suppressDetectionRef.current = true;
    setActiveView('subscricoes');
    setEditingSubscription(subscription);
    requestAnimationFrame(() => {
      setSubscriptionFormVisible(true);
    });
  }, []);

  useEffect(() => {
    if (handledAction.current || action !== 'receipt') return;
    handledAction.current = true;
    setActiveView('movimentos');
    openAddModal(true);
    showToast('Digitaliza o teu primeiro talão!', 'info');
    router.setParams({ action: '' });
  }, [action, showToast]);

  useEffect(() => {
    if (!action || action === 'receipt') {
      if (!action) handledRouteAction.current = null;
      return;
    }
    if (handledRouteAction.current === action) return;
    handledRouteAction.current = action;

    if (action === 'new-movement') {
      setActiveView('movimentos');
      openAddModal(false);
    } else if (action === 'new-subscription') {
      openSubscriptionForm(null);
    }

    router.setParams({ action: '' });
  }, [action, openSubscriptionForm]);

  const handleQuickAdd = useQuickAddActions({
    onMovement: () => openAddModal(false),
    onSubscription: () => openSubscriptionForm(null),
  });

  const showDetectionModal =
    activeDetection !== null &&
    !subscriptionFormVisible &&
    !quickAddVisible &&
    !modalVisible &&
    !suppressDetectionRef.current;

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

  function handleLearnMore() {
    if (activeView === 'subscricoes') {
      const config = MOVEMENTS_EMPTY_CONFIG.subscricoes;
      Alert.alert(config.title, config.highlights.join('\n\n• '));
    }
  }

  async function handleConfirmDetection() {
    if (!activeDetection) return;

    try {
      await saveSubscription.mutateAsync({
        name: activeDetection.name,
        amount: activeDetection.amount,
        billingInterval: activeDetection.billingInterval,
        notes: `Detetada automaticamente (${activeDetection.transactionIds.length} movimentos)`,
      });
      showToast('Subscrição adicionada.', 'success');
      markCurrentConfirmed();
    } catch {
      showToast('Não foi possível guardar a subscrição.', 'error');
    }
  }

  async function handleRefreshAll() {
    await Promise.all([refetch(), refetchLiabilities()]);
  }

  return (
    <View style={styles.screen}>
      <AppHeader
        action={{
          icon: (
            <SymbolView
              name={{ ios: 'plus', android: 'add', web: 'add' }}
              tintColor={colors.primary}
              size={22}
            />
          ),
          onPress: () => setQuickAddVisible(true),
          accessibilityLabel: 'Adicionar',
        }}
      />

      <View style={styles.viewFilters}>
        <SegmentedControl
          segments={MOVEMENTS_VIEW_SEGMENTS}
          value={activeView}
          onChange={setActiveView}
        />
      </View>

      {activeView === 'movimentos' ? (
        <>
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
                  refreshing={refreshing}
                  onRefresh={onRefresh}
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
                  title="O teu histórico começa aqui"
                  description="Regista o teu primeiro movimento para começares a acompanhar os teus gastos."
                  actionLabel="Adicionar movimento"
                  onAction={() => openAddModal(false)}
                  secondaryActionLabel="Digitalizar talão"
                  onSecondaryAction={() => openAddModal(true)}
                />
              }
            />
          )}
        </>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.sectionContent,
            { paddingBottom: Math.max(insets.bottom, spacing['2xl']) },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefetchingLiabilities}
              onRefresh={handleRefreshAll}
              tintColor={colors.primary}
            />
          }>
          <FeatureAreaGate feature="subscriptions">
            <SubscriptionsSection
              subscriptions={subscriptions}
              onCreate={() => openSubscriptionForm(null)}
              onEdit={(subscription) => openSubscriptionForm(subscription)}
              onLearnMore={handleLearnMore}
              onDelete={(item) => deleteSubscription.mutate(item.id)}
            />
          </FeatureAreaGate>
        </ScrollView>
      )}

      <AddTransactionModal
        visible={modalVisible}
        onClose={closeAddModal}
        startWithReceiptPicker={startWithReceiptPicker}
        presetFilter={filter}
      />

      <EditTransactionModal
        visible={editingTransaction !== null}
        transaction={editingTransaction}
        onClose={() => setEditingTransaction(null)}
      />

      <SubscriptionFormModal
        visible={subscriptionFormVisible}
        subscription={editingSubscription}
        onClose={closeSubscriptionForm}
      />

      <PendingSubscriptionModal
        visible={showDetectionModal}
        detection={activeDetection}
        onConfirm={handleConfirmDetection}
        onDismiss={dismissCurrent}
        isSaving={saveSubscription.isPending}
      />

      <QuickAddMenuSheet
        visible={quickAddVisible}
        onClose={() => setQuickAddVisible(false)}
        onSelect={handleQuickAdd}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  viewFilters: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
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
  sectionContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
});
