import { SymbolView } from 'expo-symbols';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlashList } from '@shopify/flash-list';
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { SubscriptionFormModal, SubscriptionsSection, MarkSubscriptionPaidModal } from '@/components/assets';
import { FeatureAreaGate } from '@/components/features';
import { AppHeader, QuickAddMenuSheet } from '@/components/layout';
import { PayCreditCardModal } from '@/components/assets/PayCreditCardModal';
import {
  AddTransactionModal,
  EditTransactionModal,
  MovementFilterChips,
  MovementMonthSummaryCard,
  MovementSearchBar,
  MOVEMENTS_EMPTY_CONFIG,
  PendingSubscriptionModal,
  RefundTransactionModal,
  SwipeableTransactionListItem,
  TransactionContextMenuSheet,
  TransactionsSkeleton,
  computeMovementFilterCounts,
  type MovementTab,
  type TransactionContextAction,
} from '@/components/movements';
import { CategoryPickerSheet } from '@/components/movements/CategoryField';
import { EmptyState, ErrorState, Text } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useDeleteSubscription, useLiabilities, useSaveSubscription } from '@/hooks/queries/useLiabilities';
import { useMarkSubscriptionReviewed } from '@/hooks/queries/useMarkSubscriptionReviewed';
import { useOnboardingAnswers } from '@/hooks/queries/useOnboardingAnswers';
import { useDiagnosticScreen } from '@/hooks/useDiagnosticScreen';
import { traceMovementStep } from '@/lib/doctor/movement-flow-trace';
import {
  useCreateTransaction,
  useDeleteTransaction,
  useTransactions,
  useUpdateTransaction,
} from '@/hooks/queries/useTransactions';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useSubscriptionDetection } from '@/hooks/useSubscriptionDetection';
import { useContextualQuickAdd } from '@/hooks/useContextualQuickAdd';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import type { MovementsView, Subscription } from '@/lib/domain/assets.types';
import type { Transaction, TransactionFilter, CashTransactionType } from '@/lib/domain/transaction.types';
import {
  compareMonthSummaries,
  groupTransactionsByDay,
} from '@/lib/domain/transaction-grouping';
import {
  flattenTransactionSections,
  getMovementStickyHeaderIndices,
  type MovementListRow,
} from '@/lib/lists/flatten-transaction-sections';
import { getCategoryLabel } from '@/lib/data/transaction-categories';
import {
  buildRecurringNameList,
  filterTransactionsBySearch,
} from '@/lib/domain/transaction-search';
import { getContextualNoTransactionsMessage } from '@/lib/onboarding/personalization';
import { getApiErrorMessage } from '@/lib/api/errors';
import { colors, spacing } from '@/lib/theme';
import { formatCurrency } from '@/lib/utils/format';

export default function MovimentosScreen() {
  useDiagnosticScreen('movements');

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
  const [markPaidSubscription, setMarkPaidSubscription] = useState<Subscription | null>(null);
  const [markPaidVisible, setMarkPaidVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [payCardVisible, setPayCardVisible] = useState(false);
  const [refundVisible, setRefundVisible] = useState(false);
  const [contextMenuTransaction, setContextMenuTransaction] = useState<Transaction | null>(null);
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [categoryPickerTransaction, setCategoryPickerTransaction] = useState<Transaction | null>(
    null,
  );

  const { data, isLoading, isError, error, refetch, isRefetching } =
    useTransactions('all');
  const {
    data: liabilities,
    refetch: refetchLiabilities,
    isRefetching: isRefetchingLiabilities,
  } = useLiabilities();
  const creditById = useMemo(
    () =>
      Object.fromEntries(
        (liabilities?.credits ?? []).map((credit) => [credit.id, credit.name]),
      ),
    [liabilities?.credits],
  );
  const { contentBottomPadding } = useResponsiveLayout();
  const { refreshing, onRefresh } = usePullToRefresh(refetch);
  const deleteMutation = useDeleteTransaction();
  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction();
  const { showToast } = useToast();
  const deleteSubscription = useDeleteSubscription();
  const markSubscriptionReviewed = useMarkSubscriptionReviewed();
  const saveSubscription = useSaveSubscription();
  const {
    activeDetection,
    dismissCurrent,
    markCurrentConfirmed,
  } = useSubscriptionDetection();

  const subscriptions = liabilities?.subscriptions ?? [];
  const recurringNames = useMemo(
    () => buildRecurringNameList(subscriptions),
    [subscriptions],
  );
  const transactions = useMemo(() => {
    const all = data ?? [];
    const typeFilter = filter === 'all' ? 'all' : filter;
    return filterTransactionsBySearch(all, {
      query: searchQuery,
      typeFilter,
      recurringNames,
    });
  }, [data, filter, searchQuery, recurringNames]);
  const { data: onboardingAnswers } = useOnboardingAnswers();
  const hasSearch = searchQuery.trim().length > 0;
  const emptyDescription = hasSearch
    ? 'Nenhum movimento encontrado. Tenta pesquisar por comerciante, categoria ou valor.'
    : getContextualNoTransactionsMessage(onboardingAnswers ?? null, filter);
  const isEmpty = !isLoading && !isError && transactions.length === 0;
  const sections = useMemo(() => groupTransactionsByDay(transactions), [transactions]);
  const movementRows = useMemo(
    () => flattenTransactionSections(sections),
    [sections],
  );
  const stickyHeaderIndices = useMemo(
    () => getMovementStickyHeaderIndices(movementRows),
    [movementRows],
  );
  const monthComparison = useMemo(() => compareMonthSummaries(data ?? []), [data]);
  const filterCounts = useMemo(
    () => computeMovementFilterCounts(data ?? [], subscriptions.length),
    [data, subscriptions.length],
  );

  useEffect(() => {
    if (view === 'creditos') {
      router.replace('/(tabs)/creditos');
      return;
    }
    if (view === 'subscricoes' || view === 'movimentos') {
      setActiveView(view);
    }
  }, [view]);

  function openAddModal(withReceipt = false) {
    traceMovementStep('form_open', { component: 'MovimentosScreen', withReceipt });
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

  const quickAddContext = activeView === 'subscricoes' ? 'subscricoes' : 'movimentos';

  const quickAdd = useContextualQuickAdd(quickAddContext, {
    onMovement: () => openAddModal(false),
    onSubscription: () => openSubscriptionForm(null),
  });

  const showDetectionModal =
    activeDetection !== null &&
    !subscriptionFormVisible &&
    !quickAdd.sheetVisible &&
    !modalVisible &&
    !suppressDetectionRef.current;

  function handleOpenContextMenu(transaction: Transaction) {
    setContextMenuTransaction(transaction);
    setContextMenuVisible(true);
  }

  function handleContextMenuAction(action: TransactionContextAction, transaction: Transaction) {
    switch (action) {
      case 'edit':
        handleEdit(transaction);
        break;
      case 'duplicate':
        handleDuplicate(transaction);
        break;
      case 'changeCategory':
        setCategoryPickerTransaction(transaction);
        break;
      case 'markRecurring':
        handleMarkRecurring(transaction);
        break;
      default:
        break;
    }
    setContextMenuTransaction(null);
  }

  function todayIsoDate(): string {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${now.getFullYear()}-${month}-${day}`;
  }

  function handleDuplicate(transaction: Transaction) {
    createMutation.mutate(
      {
        type: transaction.type,
        amount: transaction.amount,
        category: transaction.category,
        description: transaction.description,
        date: todayIsoDate(),
        accountId: transaction.accountId,
        destinationAccountId: transaction.destinationAccountId,
        creditId: transaction.creditId,
        budgetMonth: transaction.budgetMonth,
      },
      {
        onSuccess: () => showToast('Movimento duplicado.', 'success'),
        onError: () => showToast('Não foi possível duplicar o movimento.', 'error'),
      },
    );
  }

  async function handleMarkRecurring(transaction: Transaction) {
    try {
      await saveSubscription.mutateAsync({
        name: transaction.description?.trim() || getCategoryLabel(transaction.category, 'expense'),
        amount: transaction.amount,
        billingInterval: 'monthly',
        category: transaction.category,
        notes: 'Criada a partir de um movimento',
      });
      showToast('Despesa recorrente adicionada.', 'success');
    } catch {
      showToast('Não foi possível criar a despesa recorrente.', 'error');
    }
  }

  function toCashCategoryType(transaction: Transaction): CashTransactionType {
    return transaction.type === 'income' ? 'income' : 'expense';
  }

  function handleQuickCategoryChange(categoryId: string) {
    if (!categoryPickerTransaction) return;
    const transaction = categoryPickerTransaction;

    updateMutation.mutate(
      {
        transactionId: transaction.id,
        input: {
          type: transaction.type,
          amount: transaction.amount,
          category: categoryId,
          description: transaction.description,
          date: transaction.date,
          accountId: transaction.accountId,
          creditId: transaction.creditId,
          budgetMonth: transaction.budgetMonth,
        },
      },
      {
        onSuccess: () => showToast('Categoria actualizada.', 'success'),
        onError: () => showToast('Não foi possível actualizar a categoria.', 'error'),
      },
    );
    setCategoryPickerTransaction(null);
  }

  function handleEdit(transaction: Transaction) {
    if (transaction.type === 'transfer' || transaction.type === 'credit_payment') return;
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
      showToast('Despesa recorrente adicionada.', 'success');
      markCurrentConfirmed();
    } catch {
      showToast('Não foi possível guardar a despesa recorrente.', 'error');
    }
  }

  async function handleRefreshAll() {
    await Promise.all([refetch(), refetchLiabilities()]);
  }

  // Filtro unificado: Subscrições é uma "vista"; os restantes mapeiam para o filtro.
  const activeTab: MovementTab = activeView === 'subscricoes' ? 'subscricoes' : filter;
  function handleTabChange(tab: MovementTab) {
    if (tab === 'subscricoes') {
      setActiveView('subscricoes');
    } else {
      setActiveView('movimentos');
      setFilter(tab);
    }
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
          onPress: quickAdd.handlePress,
          accessibilityLabel: quickAdd.accessibilityLabel,
        }}
      />

      <View style={styles.filters}>
        <MovementFilterChips value={activeTab} counts={filterCounts} onChange={handleTabChange} />
      </View>

      {activeView === 'movimentos' ? (
        <MovementSearchBar value={searchQuery} onChange={setSearchQuery} />
      ) : null}

      {activeView === 'movimentos' ? (
        <Animated.View key={`movs-${filter}`} entering={FadeIn.duration(180)} style={styles.flex}>
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
            <FlashList
              data={movementRows}
              keyExtractor={(item) => item.key}
              getItemType={(item) => item.kind}
              stickyHeaderIndices={stickyHeaderIndices}
              renderItem={({ item }: { item: MovementListRow }) =>
                item.kind === 'header' ? (
                  <View style={styles.sectionHeader}>
                    <Text variant="label" color="textSecondary">
                      {item.title}
                    </Text>
                    <Text
                      variant="caption"
                      color={item.dayTotal >= 0 ? 'success' : 'textMuted'}>
                      {item.dayTotal > 0 ? '+' : ''}
                      {formatCurrency(item.dayTotal)}
                    </Text>
                  </View>
                ) : (
                  <SwipeableTransactionListItem
                    transaction={item.transaction}
                    creditById={creditById}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onOpenContextMenu={handleOpenContextMenu}
                  />
                )
              }
              ListHeaderComponent={
                isEmpty ? null : <MovementMonthSummaryCard comparison={monthComparison} />
              }
              contentContainerStyle={[
                styles.listContent,
                isEmpty && styles.listContentEmpty,
                { paddingBottom: contentBottomPadding },
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
                  title={hasSearch ? 'Sem resultados' : 'O teu histórico começa aqui'}
                  description={emptyDescription}
                  actionLabel="Adicionar movimento"
                  onAction={() => openAddModal(false)}
                  secondaryActionLabel="Digitalizar talão"
                  onSecondaryAction={() => openAddModal(true)}
                />
              }
            />
          )}
        </Animated.View>
      ) : (
        <Animated.View key="subs" entering={FadeIn.duration(180)} style={styles.flex}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.sectionContent,
              { paddingBottom: contentBottomPadding },
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
                onMarkPaid={(subscription) => {
                  setMarkPaidSubscription(subscription);
                  setMarkPaidVisible(true);
                }}
                onMarkReviewed={(subscription) => {
                  markSubscriptionReviewed.mutate(subscription, {
                    onSuccess: () => {
                      showToast(`«${subscription.name}» marcada como revista.`, 'success');
                    },
                    onError: (err) => {
                      showToast(getApiErrorMessage(err, 'a revisão'), 'error');
                    },
                  });
                }}
              />
            </FeatureAreaGate>
          </ScrollView>
        </Animated.View>
      )}

      <AddTransactionModal
        visible={modalVisible}
        onClose={closeAddModal}
        startWithReceiptPicker={startWithReceiptPicker}
        presetFilter={filter}
        onRequestCardPayment={() => setPayCardVisible(true)}
        onRequestRefund={() => setRefundVisible(true)}
      />

      <PayCreditCardModal
        visible={payCardVisible}
        credit={null}
        onClose={() => setPayCardVisible(false)}
      />

      <RefundTransactionModal
        visible={refundVisible}
        onClose={() => setRefundVisible(false)}
        transactions={data ?? []}
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

      <MarkSubscriptionPaidModal
        visible={markPaidVisible}
        subscription={markPaidSubscription}
        onClose={() => {
          setMarkPaidVisible(false);
          setMarkPaidSubscription(null);
        }}
      />

      <PendingSubscriptionModal
        visible={showDetectionModal}
        detection={activeDetection}
        onConfirm={handleConfirmDetection}
        onDismiss={dismissCurrent}
        isSaving={saveSubscription.isPending}
      />

      <QuickAddMenuSheet
        visible={quickAdd.sheetVisible}
        onClose={() => quickAdd.setSheetVisible(false)}
        onSelect={quickAdd.onSelect}
        actions={quickAdd.actions}
      />

      <TransactionContextMenuSheet
        visible={contextMenuVisible}
        transaction={contextMenuTransaction}
        onClose={() => setContextMenuVisible(false)}
        onSelect={handleContextMenuAction}
      />

      {categoryPickerTransaction ? (
        <CategoryPickerSheet
          visible
          type={toCashCategoryType(categoryPickerTransaction)}
          value={categoryPickerTransaction.category}
          onClose={() => setCategoryPickerTransaction(null)}
          onSelect={handleQuickCategoryChange}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  filters: {
    marginBottom: spacing.md,
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    backgroundColor: colors.background,
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
