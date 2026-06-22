import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import {
  ActionCenterSheet,
  DashboardHeaderLeading,
  DashboardSkeleton,
  DemoModeBadge,
  HomeAssistantCard,
  HomeQuickActions,
  NetWorthHeroCard,
} from '@/components/dashboard';
import { AppHeader, QuickAddMenuSheet } from '@/components/layout';
import { AddTransactionModal } from '@/components/movements';
import {
  ErrorState,
  RefetchingIndicator,
  ScreenContainer,
} from '@/components/ui';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useHomeScreenData } from '@/hooks/queries/useHomeScreenData';
import { useDiagnosticScreen } from '@/hooks/useDiagnosticScreen';
import { traceMovementStep } from '@/lib/doctor/movement-flow-trace';
import { useQuickAddActions } from '@/hooks/useQuickAddActions';
import { useCentFlowIntelligence } from '@/hooks/useCentFlowIntelligence';
import type { AssistantActionId } from '@/lib/domain/financial';
import { getHomeQuickAddActions } from '@/lib/layout/contextual-add';
import { shouldShowDemoBadge } from '@/lib/config/demo-mode';
import { colors, spacing } from '@/lib/theme';

export default function InicioScreen() {
  useDiagnosticScreen('home');

  const { data, isLoading, isError, error, refetch, isRefetching } = useHomeScreenData();

  const [addMovementVisible, setAddMovementVisible] = useState(false);
  const [startWithReceiptPicker, setStartWithReceiptPicker] = useState(false);
  const [quickAddVisible, setQuickAddVisible] = useState(false);
  const [actionCenterVisible, setActionCenterVisible] = useState(false);

  const { assistant } = useCentFlowIntelligence();
  const { contentBottomPadding } = useResponsiveLayout();
  const homeQuickAddActions = getHomeQuickAddActions();

  const openAddMovement = () => {
    traceMovementStep('form_open', { component: 'HomeScreen', withReceipt: false });
    setStartWithReceiptPicker(false);
    setAddMovementVisible(true);
  };

  const openReceiptScanner = () => {
    traceMovementStep('form_open', { component: 'HomeScreen', withReceipt: true });
    setStartWithReceiptPicker(true);
    setAddMovementVisible(true);
  };

  const handleQuickAdd = useQuickAddActions({
    onMovement: openAddMovement,
    onGoal: () => router.push('/(tabs)/ativos?action=new-goal'),
    onAsset: () => router.push('/(tabs)/ativos?action=new-asset'),
  });

  function handleHeaderAddPress() {
    if (homeQuickAddActions.length === 1) {
      handleQuickAdd(homeQuickAddActions[0]);
      return;
    }
    setQuickAddVisible(true);
  }

  const header = (
    <AppHeader
      leading={<DashboardHeaderLeading />}
      showBrand={false}
      action={{
        icon: (
          <SymbolView
            name={{ ios: 'plus.circle.fill', android: 'add_circle', web: 'add_circle' }}
            tintColor={colors.primary}
            size={26}
          />
        ),
        onPress: handleHeaderAddPress,
        accessibilityLabel: 'Adicionar',
      }}
    />
  );

  if (isLoading) {
    return (
      <View style={styles.screen}>
        {header}
        <ScreenContainer applyBottomSafeInset={false}>
          <DashboardSkeleton />
        </ScreenContainer>
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={styles.screen}>
        {header}
        <View style={styles.centered}>
          <ErrorState
            context="dashboard"
            error={error}
            onRetry={() => refetch()}
            retryLoading={isRefetching}
          />
        </View>
      </View>
    );
  }

  const {
    netWorth,
    projection,
    netWorthChangePercent,
    weeklySpending,
    netWorthChangeThisMonth,
    assetsSummary,
    recentTransactions,
    dataSource,
  } = data;

  function handleAssistantAction(actionId: AssistantActionId) {
    switch (actionId) {
      case 'add_expense':
        openAddMovement();
        break;
      case 'scan_receipt':
        openReceiptScanner();
        break;
      case 'create_goal':
        router.push('/(tabs)/ativos?action=new-goal');
        break;
      case 'add_subscription':
        router.push('/(tabs)/movimentos?view=subscricoes&action=new-subscription');
        break;
      case 'review_subscriptions':
        router.push('/(tabs)/movimentos?view=subscricoes');
        break;
      case 'view_warranties':
        router.push('/(tabs)/ativos?tab=garantias');
        break;
      case 'view_plan':
        setActionCenterVisible(true);
        break;
    }
  }

  const closeAddMovement = () => {
    setAddMovementVisible(false);
    setStartWithReceiptPicker(false);
  };

  const hasActivity =
    recentTransactions.length > 0 ||
    assetsSummary.goalsCount > 0 ||
    assetsSummary.warrantiesCount > 0 ||
    assetsSummary.inventoryCount > 0;

  return (
    <View style={styles.screen}>
      {header}

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
          { paddingBottom: contentBottomPadding },
        ]}>
        <ScreenContainer scrollable={false} applyBottomSafeInset={false}>
          {shouldShowDemoBadge(dataSource) ? <DemoModeBadge /> : null}

          <NetWorthHeroCard
            netWorth={netWorth}
            changePercent={netWorthChangePercent}
            monthlyChange={netWorthChangeThisMonth}
            weeklySpending={weeklySpending}
            futureMovementsDelta={projection.futureMovementsDelta}
            hasActivity={hasActivity}
            onAddMovement={openAddMovement}
            onScanReceipt={openReceiptScanner}
          />

          <HomeAssistantCard
            plan={assistant}
            onAction={handleAssistantAction}
            onOpenActionCenter={() => setActionCenterVisible(true)}
          />

          <HomeQuickActions
            onAddMovement={openAddMovement}
            onViewMovements={() => router.push('/(tabs)/movimentos')}
            onNewGoal={() => router.push('/(tabs)/ativos?action=new-goal')}
            recommendedActions={[
              {
                key: 'asset',
                label: 'Novo ativo',
                onPress: () => router.push('/(tabs)/ativos?action=new-asset'),
              },
            ]}
          />

          <RefetchingIndicator visible={isRefetching} />
        </ScreenContainer>
      </ScrollView>

      <AddTransactionModal
        visible={addMovementVisible}
        onClose={closeAddMovement}
        startWithReceiptPicker={startWithReceiptPicker}
      />

      <QuickAddMenuSheet
        visible={quickAddVisible}
        onClose={() => setQuickAddVisible(false)}
        onSelect={handleQuickAdd}
        allowedActions={homeQuickAddActions}
      />

      <ActionCenterSheet
        visible={actionCenterVisible}
        onClose={() => setActionCenterVisible(false)}
        onSelect={handleAssistantAction}
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
});
