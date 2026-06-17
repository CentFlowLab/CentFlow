import { SymbolView } from 'expo-symbols';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  ASSETS_EMPTY_CONFIG,
  AssetsOverviewCard,
  GoalFormModal,
  GoalsSection,
  InventoryFormModal,
  InventorySection,
  WarrantyFormModal,
  WarrantiesSection,
} from '@/components/assets';
import { FeatureAreaGate } from '@/components/features';
import { AppHeader, QuickAddMenuSheet } from '@/components/layout';
import { ScreenContainer, ErrorState, AssetsSkeleton, RefetchingIndicator } from '@/components/ui';
import {
  useAssets,
  useDeleteGoal,
  useDeleteInventoryItem,
  useDeleteWarranty,
} from '@/hooks/queries/useAssets';
import { useQuickAddActions } from '@/hooks/useQuickAddActions';
import type { AssetsTab, Goal, Warranty } from '@/lib/domain/assets.types';
import type { InventoryItem } from '@/lib/domain/types';
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
  const [quickAddVisible, setQuickAddVisible] = useState(false);

  const { data, refetch, isRefetching, isLoading, isError, error } = useAssets();
  const deleteGoal = useDeleteGoal();
  const deleteWarranty = useDeleteWarranty();
  const deleteInventory = useDeleteInventoryItem();

  const assets = data ?? {
    goals: [],
    warranties: [],
    inventory: [],
    credits: [],
    subscriptions: [],
  };

  const counts = useMemo(
    () => ({
      goals: assets.goals.length,
      warranties: assets.warranties.length,
      inventory: assets.inventory.length,
    }),
    [assets],
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

  const handleQuickAdd = useQuickAddActions({
    onGoal: openCreateGoal,
  });

  return (
    <View style={styles.screen}>
      <AppHeader
        action={{
          icon: (
            <SymbolView
              name={{ ios: 'plus.circle.fill', android: 'add_circle', web: 'add_circle' }}
              tintColor={colors.primary}
              size={26}
            />
          ),
          onPress: () => setQuickAddVisible(true),
          accessibilityLabel: 'Adicionar',
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
              refreshing={isRefetching}
              onRefresh={() => refetch()}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, spacing['2xl']) },
          ]}>
          <ScreenContainer scrollable={false}>
            <View style={styles.overviewSection}>
              <AssetsOverviewCard
                counts={counts}
                activeTab={activeTab}
                onTabPress={setActiveTab}
              />
            </View>

            {activeTab === 'objetivos' ? (
              <FeatureAreaGate feature="goals">
                <GoalsSection
                  goals={assets.goals}
                  onEdit={openEditGoal}
                  onLearnMore={handleLearnMore}
                  onDelete={(goal) => deleteGoal.mutate(goal.id)}
                />
              </FeatureAreaGate>
            ) : null}

            {activeTab === 'garantias' ? (
              <FeatureAreaGate feature="receipts">
                <WarrantiesSection
                  warranties={assets.warranties}
                  onEdit={openEditWarranty}
                  onLearnMore={handleLearnMore}
                  onDelete={(warranty) => deleteWarranty.mutate(warranty.id)}
                />
              </FeatureAreaGate>
            ) : null}

            {activeTab === 'inventario' ? (
              <FeatureAreaGate feature="wealth">
                <InventorySection
                  inventory={assets.inventory}
                  onEdit={openEditInventory}
                  onLearnMore={handleLearnMore}
                  onDelete={(item) => deleteInventory.mutate(item.id)}
                />
              </FeatureAreaGate>
            ) : null}

            <RefetchingIndicator visible={isRefetching && !isLoading} />
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
  scrollContent: {
    paddingBottom: spacing.lg,
  },
  overviewSection: {
    marginBottom: spacing['2xl'],
  },
  errorState: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
});
