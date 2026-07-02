import { SymbolView } from 'expo-symbols';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { AccountFormModal, TransferAccountModal } from '@/components/accounts';
import {
  ASSETS_EMPTY_CONFIG,
  AccountsSection,
  AssetsOverviewCard,
  GoalContributeModal,
  GoalFormModal,
  GoalWithdrawModal,
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
import { useAccountsWithBalances } from '@/hooks/queries/useAccounts';
import { useContextualQuickAdd } from '@/hooks/useContextualQuickAdd';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import type { QuickAddScreenContext } from '@/lib/navigation/quick-add-context';
import type { AssetsTab, Goal, Warranty } from '@/lib/domain/assets.types';
import type { BankAccount } from '@/lib/domain/account.types';
import type { InventoryItem } from '@/lib/domain/types';
import { colors, spacing } from '@/lib/theme';

export default function AtivosScreen() {
  const { action, tab } = useLocalSearchParams<{ action?: string; tab?: string }>();
  const handledAction = useRef(false);
  const pendingContributeGoal = useRef<Goal | null>(null);
  const pendingWithdrawGoal = useRef<Goal | null>(null);
  const [activeTab, setActiveTab] = useState<AssetsTab>('objetivos');
  const [goalFormVisible, setGoalFormVisible] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [warrantyFormVisible, setWarrantyFormVisible] = useState(false);
  const [editingWarranty, setEditingWarranty] = useState<Warranty | null>(null);
  const [inventoryFormVisible, setInventoryFormVisible] = useState(false);
  const [editingInventory, setEditingInventory] = useState<InventoryItem | null>(null);
  const [accountFormVisible, setAccountFormVisible] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [transferVisible, setTransferVisible] = useState(false);
  const [contributeGoal, setContributeGoal] = useState<Goal | null>(null);
  const [withdrawGoal, setWithdrawGoal] = useState<Goal | null>(null);

  const { data, refetch, isRefetching, isLoading, isError, error } = useAssets();
  const {
    data: accounts = [],
    totalBalance,
    refetch: refetchAccounts,
    isRefetching: isRefetchingAccounts,
  } = useAccountsWithBalances();
  const { contentBottomPadding } = useResponsiveLayout();
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
      accounts: accounts.length,
    }),
    [assets, accounts.length],
  );

  function handleLearnMore() {
    const config = ASSETS_EMPTY_CONFIG[activeTab];
    Alert.alert(config.title, config.highlights.join('\n\n• '));
  }

  useEffect(() => {
    if (tab === 'objetivos' || tab === 'garantias' || tab === 'inventario' || tab === 'contas') {
      setActiveTab(tab);
    }
  }, [tab]);

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
      return;
    }

    if (action === 'new-account') {
      setActiveTab('contas');
      setEditingAccount(null);
      setAccountFormVisible(true);
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

  function openCreateAccount() {
    setEditingAccount(null);
    setAccountFormVisible(true);
  }

  function openEditAccount(account: BankAccount) {
    setEditingAccount(account);
    setAccountFormVisible(true);
  }

  function closeAccountForm() {
    setAccountFormVisible(false);
    setEditingAccount(null);
  }

  const assetsQuickAddContext: QuickAddScreenContext =
    activeTab === 'contas'
      ? 'ativos_contas'
      : activeTab === 'garantias'
      ? 'ativos_garantias'
      : activeTab === 'inventario'
        ? 'ativos_inventario'
        : 'ativos_objetivos';

  const quickAdd = useContextualQuickAdd(assetsQuickAddContext, {
    onGoal: openCreateGoal,
    onWarranty: openCreateWarranty,
    onAsset: openCreateInventory,
    onAccount: openCreateAccount,
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
          onPress: quickAdd.handlePress,
          accessibilityLabel: quickAdd.accessibilityLabel,
        }}
      />

      {isLoading ? (
        <ScreenContainer applyBottomSafeInset={false}>
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
              refreshing={isRefetching || isRefetchingAccounts}
              onRefresh={() => Promise.all([refetch(), refetchAccounts()])}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: contentBottomPadding },
          ]}>
          <ScreenContainer scrollable={false} applyBottomSafeInset={false}>
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
                  onPrimaryAction={openCreateGoal}
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
                  onPrimaryAction={openCreateWarranty}
                  onScanReceipt={() => router.push('/(tabs)/movimentos?action=receipt')}
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

            {activeTab === 'contas' ? (
              <AccountsSection
                accounts={accounts}
                totalBalance={totalBalance}
                onCreate={openCreateAccount}
                onEdit={openEditAccount}
                onLearnMore={handleLearnMore}
                onTransfer={() => setTransferVisible(true)}
              />
            ) : null}

            <RefetchingIndicator visible={(isRefetching || isRefetchingAccounts) && !isLoading} />
          </ScreenContainer>
        </ScrollView>
      )}

      <GoalFormModal
        visible={goalFormVisible}
        goal={editingGoal}
        onClose={closeGoalForm}
        onDismissed={() => {
          const pendingContribute = pendingContributeGoal.current;
          const pendingWithdraw = pendingWithdrawGoal.current;
          if (pendingContribute) {
            pendingContributeGoal.current = null;
            requestAnimationFrame(() => {
              setContributeGoal(pendingContribute);
            });
            return;
          }
          if (pendingWithdraw) {
            pendingWithdrawGoal.current = null;
            requestAnimationFrame(() => {
              setWithdrawGoal(pendingWithdraw);
            });
          }
        }}
        onContribute={(goal) => {
          pendingContributeGoal.current = goal;
          setGoalFormVisible(false);
        }}
        onWithdraw={(goal) => {
          pendingWithdrawGoal.current = goal;
          setGoalFormVisible(false);
        }}
      />

      <GoalContributeModal
        visible={Boolean(contributeGoal)}
        goal={contributeGoal}
        onClose={() => setContributeGoal(null)}
        onCreateAccount={() => {
          setContributeGoal(null);
          setActiveTab('contas');
          openCreateAccount();
        }}
      />

      <GoalWithdrawModal
        visible={Boolean(withdrawGoal)}
        goal={withdrawGoal}
        onClose={() => setWithdrawGoal(null)}
      />

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

      <AccountFormModal
        visible={accountFormVisible}
        account={editingAccount}
        onClose={closeAccountForm}
      />

      <TransferAccountModal visible={transferVisible} onClose={() => setTransferVisible(false)} />

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
