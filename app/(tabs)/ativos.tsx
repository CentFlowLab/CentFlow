import { SymbolView } from 'expo-symbols';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  ASSETS_EMPTY_CONFIG,
  AssetsOverviewCard,
  CreditFormModal,
  CreditsSection,
  GoalFormModal,
  GoalsSection,
  InventoryFormModal,
  InventorySection,
  SubscriptionFormModal,
  SubscriptionsSection,
  WarrantyFormModal,
  WarrantiesSection,
} from '@/components/assets';
import { AppHeader } from '@/components/layout';
import { ScreenContainer, ErrorState, AssetsSkeleton, RefetchingIndicator } from '@/components/ui';
import {
  useAssets,
  useDeleteGoal,
  useDeleteInventoryItem,
  useDeleteWarranty,
} from '@/hooks/queries/useAssets';
import {
  useDeleteCredit,
  useDeleteSubscription,
  useLiabilities,
} from '@/hooks/queries/useLiabilities';
import type { AssetsTab, Goal, Subscription, Warranty } from '@/lib/domain/assets.types';
import type { Credit, InventoryItem } from '@/lib/domain/types';
import { colors, spacing } from '@/lib/theme';

export default function AtivosScreen() {
  const insets = useSafeAreaInsets();
  const { action } = useLocalSearchParams<{ action?: string }>();
  const handledAction = useRef(false);
  const [activeTab, setActiveTab] = useState<AssetsTab>('objetivos');
  const [goalFormVisible, setGoalFormVisible] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [warrantyFormVisible, setWarrantyFormVisible] = useState(false);
  const [editingWarranty, setEditingWarranty] = useState<Warranty | null>(null);
  const [inventoryFormVisible, setInventoryFormVisible] = useState(false);
  const [editingInventory, setEditingInventory] = useState<InventoryItem | null>(null);
  const [creditFormVisible, setCreditFormVisible] = useState(false);
  const [editingCredit, setEditingCredit] = useState<Credit | null>(null);
  const [subscriptionFormVisible, setSubscriptionFormVisible] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);

  const { data, refetch, isRefetching, isLoading, isError, error } = useAssets();
  const {
    data: liabilities,
    refetch: refetchLiabilities,
    isRefetching: isRefetchingLiabilities,
  } = useLiabilities();
  const deleteGoal = useDeleteGoal();
  const deleteWarranty = useDeleteWarranty();
  const deleteInventory = useDeleteInventoryItem();
  const deleteCredit = useDeleteCredit();
  const deleteSubscription = useDeleteSubscription();

  const assets = data ?? {
    goals: [],
    warranties: [],
    inventory: [],
    credits: [],
    subscriptions: [],
  };
  const credits = liabilities?.credits ?? [];
  const subscriptions = liabilities?.subscriptions ?? [];

  const counts = useMemo(
    () => ({
      goals: assets.goals.length,
      warranties: assets.warranties.length,
      inventory: assets.inventory.length,
      credits: credits.length,
      subscriptions: subscriptions.length,
    }),
    [assets, credits.length, subscriptions.length],
  );

  function handleLearnMore() {
    const config = ASSETS_EMPTY_CONFIG[activeTab];
    Alert.alert(config.title, config.highlights.join('\n\n• '));
  }

  useEffect(() => {
    if (handledAction.current || !action) return;
    handledAction.current = true;

    if (action === 'new-goal') {
      setActiveTab('objetivos');
      setEditingGoal(null);
      setGoalFormVisible(true);
      return;
    }

    if (action === 'new-warranty') {
      setActiveTab('garantias');
      setEditingWarranty(null);
      setWarrantyFormVisible(true);
      return;
    }

    if (action === 'new-asset') {
      setActiveTab('inventario');
      setEditingInventory(null);
      setInventoryFormVisible(true);
    }
  }, [action]);

  function openCreateGoal() {
    setEditingGoal(null);
    setGoalFormVisible(true);
  }

  function openEditGoal(goal: Goal) {
    setEditingGoal(goal);
    setGoalFormVisible(true);
  }

  function closeGoalForm() {
    setGoalFormVisible(false);
    setEditingGoal(null);
  }

  function openCreateWarranty() {
    setEditingWarranty(null);
    setWarrantyFormVisible(true);
  }

  function openEditWarranty(warranty: Warranty) {
    setEditingWarranty(warranty);
    setWarrantyFormVisible(true);
  }

  function closeWarrantyForm() {
    setWarrantyFormVisible(false);
    setEditingWarranty(null);
  }

  function openCreateInventory() {
    setEditingInventory(null);
    setInventoryFormVisible(true);
  }

  function openEditInventory(item: InventoryItem) {
    setEditingInventory(item);
    setInventoryFormVisible(true);
  }

  function closeInventoryForm() {
    setInventoryFormVisible(false);
    setEditingInventory(null);
  }

  function openCreateCredit() {
    setEditingCredit(null);
    setCreditFormVisible(true);
  }

  function openEditCredit(credit: Credit) {
    setEditingCredit(credit);
    setCreditFormVisible(true);
  }

  function closeCreditForm() {
    setCreditFormVisible(false);
    setEditingCredit(null);
  }

  function openCreateSubscription() {
    setEditingSubscription(null);
    setSubscriptionFormVisible(true);
  }

  function openEditSubscription(subscription: Subscription) {
    setEditingSubscription(subscription);
    setSubscriptionFormVisible(true);
  }

  function closeSubscriptionForm() {
    setSubscriptionFormVisible(false);
    setEditingSubscription(null);
  }

  function handleAdd() {
    if (activeTab === 'objetivos') {
      openCreateGoal();
      return;
    }
    if (activeTab === 'garantias') {
      openCreateWarranty();
      return;
    }
    if (activeTab === 'inventario') {
      openCreateInventory();
      return;
    }
    if (activeTab === 'creditos') {
      openCreateCredit();
      return;
    }
    if (activeTab === 'subscricoes') {
      openCreateSubscription();
    }
  }

  async function handleRefresh() {
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
          onPress: handleAdd,
          accessibilityLabel: 'Adicionar ativo',
        }}
      />

      {isLoading ? (
        <ScreenContainer>
          <AssetsSkeleton />
        </ScreenContainer>
      ) : isError ? (
        <View style={styles.errorState}>
          <ErrorState
            context="assets"
            error={error}
            onRetry={() => refetch()}
            retryLoading={isRefetching}
          />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching || isRefetchingLiabilities}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, spacing['2xl']) },
          ]}>
          <ScreenContainer>
            <View style={styles.overviewSection}>
              <AssetsOverviewCard
                counts={counts}
                activeTab={activeTab}
                onTabPress={setActiveTab}
              />
            </View>

            {activeTab === 'objetivos' ? (
              <GoalsSection
                goals={assets.goals}
                onEdit={openEditGoal}
                onLearnMore={handleLearnMore}
                onDelete={(goal) => deleteGoal.mutate(goal.id)}
              />
            ) : null}

            {activeTab === 'garantias' ? (
              <WarrantiesSection
                warranties={assets.warranties}
                onEdit={openEditWarranty}
                onLearnMore={handleLearnMore}
                onDelete={(warranty) => deleteWarranty.mutate(warranty.id)}
              />
            ) : null}

            {activeTab === 'inventario' ? (
              <InventorySection
                inventory={assets.inventory}
                onEdit={openEditInventory}
                onLearnMore={handleLearnMore}
                onDelete={(item) => deleteInventory.mutate(item.id)}
              />
            ) : null}

            {activeTab === 'creditos' ? (
              <CreditsSection
                credits={credits}
                onCreate={openCreateCredit}
                onEdit={openEditCredit}
                onLearnMore={handleLearnMore}
                onDelete={(credit) => deleteCredit.mutate(credit.id)}
              />
            ) : null}

            {activeTab === 'subscricoes' ? (
              <SubscriptionsSection
                subscriptions={subscriptions}
                onCreate={openCreateSubscription}
                onEdit={openEditSubscription}
                onLearnMore={handleLearnMore}
                onDelete={(item) => deleteSubscription.mutate(item.id)}
              />
            ) : null}

            <RefetchingIndicator visible={(isRefetching || isRefetchingLiabilities) && !isLoading} />
          </ScreenContainer>
        </ScrollView>
      )}

      <GoalFormModal visible={goalFormVisible} goal={editingGoal} onClose={closeGoalForm} />

      <WarrantyFormModal
        visible={warrantyFormVisible}
        warranty={editingWarranty}
        onClose={closeWarrantyForm}
      />

      <InventoryFormModal
        visible={inventoryFormVisible}
        item={editingInventory}
        onClose={closeInventoryForm}
      />

      <CreditFormModal
        visible={creditFormVisible}
        credit={editingCredit}
        onClose={closeCreditForm}
      />

      <SubscriptionFormModal
        visible={subscriptionFormVisible}
        subscription={editingSubscription}
        onClose={closeSubscriptionForm}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  overviewSection: {
    marginBottom: spacing['2xl'],
  },
  errorState: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
});
