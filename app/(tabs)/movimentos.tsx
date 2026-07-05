import { SymbolView } from 'expo-symbols';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlashList } from '@shopify/flash-list';
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { SubscriptionFormModal, SubscriptionsSection, MarkSubscriptionPaidModal } from '@/components/assets';
import { FeatureAreaGate } from '@/components/features';
import { AppHeader, QuickAddMenuSheet } from '@/components/layout';
import { TransferAccountModal } from '@/components/accounts';
import { PayCreditCardModal } from '@/components/assets/PayCreditCardModal';
import {
  AddTransactionModal,
  EditTransactionModal,
  MovementFilterChips,
  MovementSearchBar,
  MOVEMENTS_EMPTY_CONFIG,
  PendingSubscriptionModal,
  RefundTransactionModal,
  SwipeableTransactionListItem,
  TransactionsSkeleton,
  type MovementTab,
} from '@/components/movements';
import { EmptyState, ErrorState, Text } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useAccountsWithBalances } from '@/hooks/queries/useAccounts';
import { useDeleteSubscription, useLiabilities, useSaveSubscription } from '@/hooks/queries/useLiabilities';
import { useOnboardingAnswers } from '@/hooks/queries/useOnboardingAnswers';
import { useDiagnosticScreen } from '@/hooks/useDiagnosticScreen';
import { traceMovementStep } from '@/lib/doctor/movement-flow-trace';
import {
  useDeleteTransaction,
  useTransactions,
} from '@/hooks/queries/useTransactions';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useSubscriptionDetection } from '@/hooks/useSubscriptionDetection';
import { useContextualQuickAdd } from '@/hooks/useContextualQuickAdd';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import type { MovementsView, Subscription } from '@/lib/domain/assets.types';
import type { Transaction, TransactionFilter } from '@/lib/domain/transaction.types';
import {
  groupTransactionsByDay,
  summarizeCurrentMonth,
} from '@/lib/domain/transaction-grouping';
import {
  flattenTransactionSections,
  type MovementListRow,
} from '@/lib/lists/flatten-transaction-sections';
import {
  buildRecurringNameList,
  filterTransactionsBySearch,
} from '@/lib/domain/transaction-search';
import { getContextualNoTransactionsMessage } from '@/lib/onboarding/personalization';
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
  const [transferVisible, setTransferVisible] = useState(false);
  const [payCardVisible, setPayCardVisible] = useState(false);
  const [refundVisible, setRefundVisible] = useState(false);

  const { data, isLoading, isError, error, refetch, isRefetching } =
    useTransactions('all');
  const { data: accounts = [] } = useAccountsWithBalances();
  const {
    data: liabilities,
    refetch: refetchLiabilities,
    isRefetching: isRefetchingLiabilities,
  } = useLiabilities();
  const accountById = useMemo(
    () => Object.fromEntries(accounts.map((account) => [account.id, account.name])),
    [accounts],
  );
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
  const { showToast } = useToast();
  const deleteSubscription = useDeleteSubscription();
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
  const monthSummary = useMemo(
    () => summarizeCurrentMonth(data ?? []),
    [data],
  );

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
        <MovementFilterChips value={activeTab} onChange={handleTabChange} />
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
                    accountById={accountById}
                    creditById={creditById}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                )
              }
              ListHeaderComponent={
                isEmpty ? null : (
                  <View style={styles.monthSummary}>
                    <Text variant="caption" color="textMuted">
                      Este mês
                    </Text>
                    <View style={styles.monthSummaryRow}>
                      <Text
                        variant="bodyMedium"
                        color={monthSummary.net >= 0 ? 'success' : 'text'}>
                        {monthSummary.net > 0 ? '+' : ''}
                        {formatCurrency(monthSummary.net)}
                      </Text>
                      <Text variant="caption" color="textMuted">
                        {monthSummary.count} movimento{monthSummary.count === 1 ? '' : 's'}
                      </Text>
                    </View>
                  </View>
                )
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
        onRequestTransfer={() => setTransferVisible(true)}
        onRequestCardPayment={() => setPayCardVisible(true)}
        onRequestRefund={() => setRefundVisible(true)}
      />

      <TransferAccountModal visible={transferVisible} onClose={() => setTransferVisible(false)} />

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
