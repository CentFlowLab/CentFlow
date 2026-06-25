import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import {
  DashboardHeaderLeading,
  DashboardSkeleton,
  DemoModeBadge,
  HomeAlertsSection,
  HomeAssetsSummaryCard,
  HomeAssistantCard,
  HomeQuickActions,
  HomeAttentionSheet,
  NetWorthHeroCard,
} from '@/components/dashboard';
import { AppHeader, QuickAddMenuSheet } from '@/components/layout';
import { AddTransactionModal } from '@/components/movements';
import { ErrorState, RefetchingIndicator, ScreenContainer } from '@/components/ui';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useHomeScreenData } from '@/hooks/queries/useHomeScreenData';
import { useContextualQuickAdd } from '@/hooks/useContextualQuickAdd';
import { useCentFlowIntelligence } from '@/hooks/useCentFlowIntelligence';
import { useDiagnosticScreen } from '@/hooks/useDiagnosticScreen';
import { traceMovementStep } from '@/lib/doctor/movement-flow-trace';
import type { AssistantActionId } from '@/lib/domain/financial';
import { shouldShowDemoBadge } from '@/lib/config/demo-mode';
import { colors, spacing } from '@/lib/theme';

export default function InicioScreen() {
  useDiagnosticScreen('home');

  const { data, isLoading, isError, error, refetch, isRefetching } = useHomeScreenData();
  const [addMovementVisible, setAddMovementVisible] = useState(false);
  const [startWithReceiptPicker, setStartWithReceiptPicker] = useState(false);
  const [attentionSheetVisible, setAttentionSheetVisible] = useState(false);

  const { assistant } = useCentFlowIntelligence();
  const { contentBottomPadding } = useResponsiveLayout();

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

  const closeAddMovement = () => {
    setAddMovementVisible(false);
    setStartWithReceiptPicker(false);
  };

  const quickAdd = useContextualQuickAdd('home', {
    onMovement: openAddMovement,
    onAsset: () => router.push('/(tabs)/ativos?action=new-asset'),
    onGoal: () => router.push('/(tabs)/ativos?action=new-goal'),
  });

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
      default:
        break;
    }
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
        onPress: quickAdd.handlePress,
        accessibilityLabel: quickAdd.accessibilityLabel,
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
    dataSource,
    attentionItems,
    suggestions,
  } = data;

  const hasActivity =
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

          {hasActivity ? <HomeAssetsSummaryCard summary={assetsSummary} /> : null}

          <HomeAlertsSection
            attentionItems={attentionItems}
            suggestions={suggestions}
            onOpenAllAttention={() => setAttentionSheetVisible(true)}
          />

          <HomeAssistantCard
            plan={assistant}
            onAction={handleAssistantAction}
            onOpenActionCenter={() => openAddMovement()}
          />

          <HomeQuickActions
            onAddMovement={openAddMovement}
            onAddAsset={() => router.push('/(tabs)/ativos?action=new-asset')}
            onAddGoal={() => router.push('/(tabs)/ativos?action=new-goal')}
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
        visible={quickAdd.sheetVisible}
        onClose={() => quickAdd.setSheetVisible(false)}
        onSelect={quickAdd.onSelect}
        actions={quickAdd.actions}
      />

      <HomeAttentionSheet
        visible={attentionSheetVisible}
        onClose={() => setAttentionSheetVisible(false)}
        items={attentionItems}
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
});
