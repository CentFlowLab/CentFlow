import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  ASSETS_EMPTY_CONFIG,
  ASSETS_SEGMENTS,
  AddAssetModal,
  AddWarrantyModal,
  AssetsOverviewCard,
  GoalFormModal,
  GoalsSection,
  InventorySection,
  WarrantiesSection,
} from '@/components/assets';
import { AppHeader, SegmentedControl } from '@/components/layout';
import { ScreenContainer, ErrorState, AssetsSkeleton, RefetchingIndicator } from '@/components/ui';
import {
  useAssets,
  useDeleteGoal,
  useDeleteInventoryItem,
  useDeleteWarranty,
} from '@/hooks/queries/useAssets';
import type { AssetsTab, Goal } from '@/lib/domain/assets.types';
import { colors, spacing } from '@/lib/theme';

export default function AtivosScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<AssetsTab>('objetivos');
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [goalFormVisible, setGoalFormVisible] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [addWarrantyModalVisible, setAddWarrantyModalVisible] = useState(false);

  const { data, refetch, isRefetching, isLoading, isError, error } = useAssets();
  const deleteGoal = useDeleteGoal();
  const deleteWarranty = useDeleteWarranty();
  const deleteInventory = useDeleteInventoryItem();

  const assets = data ?? { goals: [], warranties: [], inventory: [] };

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

  function handleAdd() {
    if (activeTab === 'objetivos') {
      openCreateGoal();
      return;
    }
    if (activeTab === 'garantias') {
      setAddWarrantyModalVisible(true);
      return;
    }
    setAddModalVisible(true);
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
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, spacing['2xl']) },
        ]}>
        <ScreenContainer>
          <AssetsOverviewCard counts={counts} />

          <View style={styles.segmentWrapper}>
            <SegmentedControl
              segments={ASSETS_SEGMENTS}
              value={activeTab}
              onChange={setActiveTab}
            />
          </View>

          {activeTab === 'objetivos' ? (
            <GoalsSection
              goals={assets.goals}
              onAdd={openCreateGoal}
              onEdit={openEditGoal}
              onLearnMore={handleLearnMore}
              onDelete={(goal) => deleteGoal.mutate(goal.id)}
            />
          ) : null}

          {activeTab === 'garantias' ? (
            <WarrantiesSection
              warranties={assets.warranties}
              onAdd={handleAdd}
              onLearnMore={handleLearnMore}
              onDelete={(warranty) => deleteWarranty.mutate(warranty.id)}
            />
          ) : null}

          {activeTab === 'inventario' ? (
            <InventorySection
              inventory={assets.inventory}
              onAdd={handleAdd}
              onLearnMore={handleLearnMore}
              onDelete={(item) => deleteInventory.mutate(item.id)}
            />
          ) : null}

          <RefetchingIndicator visible={isRefetching && !isLoading} />
        </ScreenContainer>
      </ScrollView>
      )}

      <GoalFormModal
        visible={goalFormVisible}
        goal={editingGoal}
        onClose={closeGoalForm}
      />

      <AddWarrantyModal
        visible={addWarrantyModalVisible}
        onClose={() => setAddWarrantyModalVisible(false)}
      />

      <AddAssetModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
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
  segmentWrapper: {
    marginTop: spacing.lg,
    marginBottom: spacing['2xl'],
  },
  errorState: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
});
