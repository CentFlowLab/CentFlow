import { SymbolView } from 'expo-symbols';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, SectionList, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { SubscriptionFormModal, SubscriptionsSection } from '@/components/assets';
import { FeatureAreaGate } from '@/components/features';
import { AppHeader, QuickAddMenuSheet } from '@/components/layout';
import {
  AddTransactionModal,
  EditTransactionModal,
  MovementFilterChips,
  MOVEMENTS_EMPTY_CONFIG,
  PendingSubscriptionModal,
  QuickExpenseSheet,
  SwipeableTransactionListItem,
  TransactionsSkeleton,
  type MovementTab,
} from '@/components/movements';
import { EmptyState, ErrorState, Text, TextField } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useDeleteSubscription, useLiabilities, useSaveSubscription } from '@/hooks/queries/useLiabilities';
import { useMerchantGroups } from '@/hooks/queries/useMerchantGroups';
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
import { getContextualNoTransactionsMessage } from '@/lib/onboarding/personalization';
import {
  filterTransactionsBySearch,
  getMerchantGroupName,
} from '@/lib/merchants/transaction-search';
import { colors, spacing } from '@/lib/theme';
import { resolveSubscriptionCategory } from '@/lib/subscriptions/auto-categorize';
import { formatCurrency } from '@/lib/utils/format';

export default function MovimentosScreen() {
  useDiagnosticScreen('movements');

  const { action, view, group: groupFilter } = useLocalSearchParams<{
    action?: string;
    view?: string;
    group?: string;
  }>();
  const handledAction = useRef(false);
  const handledRouteAction = useRef<string | null>(null);
  const suppressDetectionRef = useRef(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState<MovementsView>('movimentos');
  const [filter, setFilter] = useState<TransactionFilter>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [quickExpenseVisible, setQuickExpenseVisible] = useState(false);
  const [startWithReceiptPicker, setStartWithReceiptPicker] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [subscriptionFormVisible, setSubscriptionFormVisible] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);

  const { data, isLoading, isError, error, refetch, isRefetching } =
    useTransactions(filter);
  const { contentBottomPadding } = useResponsiveLayout();
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
  const { data: merchantGroups = [] } = useMerchantGroups();
  const rawTransactions = useMemo(() => data ?? [], [data]);
  const transactions = useMemo(() => {
    let list = rawTransactions;
    if (groupFilter) {
      list = list.filter((tx) => tx.merchantGroupId === groupFilter);
    }
    return filterTransactionsBySearch(list, searchQuery, merchantGroups);
  }, [rawTransactions, searchQuery, merchantGroups, groupFilter]);
  const { data: onboardingAnswers } = useOnboardingAnswers();
  const emptyDescription = getContextualNoTransactionsMessage(onboardingAnswers ?? null, filter);
  const isFiltered = Boolean(searchQuery.trim() || groupFilter);
  const isSearchEmpty =
    !isLoading && !isError && rawTransactions.length > 0 && transactions.length === 0;
  const isEmpty = !isLoading && !isError && rawTransactions.length === 0;
  const showEmptyList = isEmpty || isSearchEmpty;
  const activeGroupName = groupFilter
    ? getMerchantGroupName(groupFilter, merchantGroups)
    : null;
  const monthSummaryLabel = isFiltered ? 'Filtrado' : 'Este mês';
  const sections = useMemo(() => groupTransactionsByDay(transactions), [transactions]);
  const monthSummary = useMemo(() => summarizeCurrentMonth(transactions), [transactions]);

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
    onQuickExpense: () => setQuickExpenseVisible(true),
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
        category: resolveSubscriptionCategory(activeDetection.name),
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
        {activeView === 'movimentos' ? (
          <TextField
            label="Pesquisar"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Descrição ou grupo (ex: café)"
            style={styles.searchField}
          />
        ) : null}
        {activeView === 'movimentos' && activeGroupName ? (
          <View style={styles.groupFilterBanner}>
            <Text variant="caption" color="textSecondary" style={styles.groupFilterLabel}>
              Grupo: {activeGroupName}
            </Text>
            <Pressable
              onPress={() => router.setParams({ group: '' })}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Limpar filtro de grupo">
              <SymbolView
                name={{ ios: 'xmark.circle.fill', android: 'close', web: 'close' }}
                tintColor={colors.textMuted}
                size={20}
              />
            </Pressable>
          </View>
        ) : null}
      </View>

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
            <SectionList
              sections={sections}
              keyExtractor={(item) => item.id}
              stickySectionHeadersEnabled={false}
              initialNumToRender={12}
              maxToRenderPerBatch={8}
              windowSize={8}
              removeClippedSubviews
              renderItem={({ item }) => (
                <SwipeableTransactionListItem
                  transaction={item}
                  merchantGroupName={getMerchantGroupName(item.merchantGroupId, merchantGroups)}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              )}
              renderSectionHeader={({ section }) => (
                <View style={styles.sectionHeader}>
                  <Text variant="label" color="textSecondary">
                    {section.title}
                  </Text>
                  <Text
                    variant="caption"
                    color={section.dayTotal >= 0 ? 'success' : 'textMuted'}>
                    {section.dayTotal > 0 ? '+' : ''}
                    {formatCurrency(section.dayTotal)}
                  </Text>
                </View>
              )}
              ListHeaderComponent={
                showEmptyList ? null : (
                  <View style={styles.monthSummary}>
                    <Text variant="caption" color="textMuted">
                      {monthSummaryLabel}
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
                showEmptyList && styles.listContentEmpty,
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
                isSearchEmpty ? (
                  <EmptyState
                    icon={
                      <SymbolView
                        name={{
                          ios: 'magnifyingglass',
                          android: 'search',
                          web: 'search',
                        }}
                        tintColor={colors.primary}
                        size={32}
                      />
                    }
                    title="Nenhum resultado"
                    description="Não encontrámos movimentos com estes filtros. Tenta outra pesquisa ou limpa o filtro."
                    actionLabel={groupFilter ? 'Limpar grupo' : 'Limpar pesquisa'}
                    onAction={() => {
                      if (groupFilter) {
                        router.setParams({ group: '' });
                      } else {
                        setSearchQuery('');
                      }
                    }}
                  />
                ) : (
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
                    description={emptyDescription}
                    actionLabel="Adicionar movimento"
                    onAction={() => openAddModal(false)}
                    secondaryActionLabel="Digitalizar talão"
                    onSecondaryAction={() => openAddModal(true)}
                  />
                )
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

      <QuickExpenseSheet
        visible={quickExpenseVisible}
        onClose={() => setQuickExpenseVisible(false)}
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
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  searchField: {
    marginTop: spacing.xs,
  },
  groupFilterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  groupFilterLabel: {
    flex: 1,
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
