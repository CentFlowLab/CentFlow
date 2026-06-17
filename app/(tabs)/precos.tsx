import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CreditFormModal, CreditsSection } from '@/components/assets';
import { FeatureAreaGate } from '@/components/features';
import { AppHeader, QuickAddMenuSheet } from '@/components/layout';
import { ErrorState, ScreenContainer } from '@/components/ui';
import { useDeleteCredit, useLiabilities } from '@/hooks/queries/useLiabilities';
import { useQuickAddActions } from '@/hooks/useQuickAddActions';
import type { Credit } from '@/lib/domain/types';
import { colors, spacing } from '@/lib/theme';

export default function PrecosScreen() {
  const insets = useSafeAreaInsets();
  const [editingCredit, setEditingCredit] = useState<Credit | null>(null);
  const [creditFormVisible, setCreditFormVisible] = useState(false);
  const [quickAddVisible, setQuickAddVisible] = useState(false);

  const { data, isError, error, refetch, isRefetching } = useLiabilities();
  const deleteCredit = useDeleteCredit();
  const credits = data?.credits ?? [];

  const handleQuickAdd = useQuickAddActions({
    onGoal: undefined,
    onMovement: undefined,
    onProduct: undefined,
    onSubscription: undefined,
  });

  function openNewCredit() {
    setEditingCredit(null);
    setCreditFormVisible(true);
  }

  return (
    <View style={styles.screen}>
      <AppHeader
        title="Créditos"
        subtitle="Dívida, próximos pagamentos e análise"
        action={{
          icon: (
            <SymbolView
              name={{ ios: 'plus.circle.fill', android: 'add_circle', web: 'add_circle' }}
              tintColor={colors.primary}
              size={26}
            />
          ),
          onPress: openNewCredit,
          accessibilityLabel: 'Adicionar crédito',
        }}
      />

      {isError ? (
        <View style={styles.centered}>
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
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Math.max(insets.bottom, spacing['2xl']) },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => refetch()}
              tintColor={colors.primary}
            />
          }>
          <ScreenContainer scrollable={false}>
            <FeatureAreaGate feature="credits">
              <CreditsSection
                credits={credits}
                onCreate={openNewCredit}
                onEdit={(credit) => {
                  setEditingCredit(credit);
                  setCreditFormVisible(true);
                }}
                onDelete={(credit) => deleteCredit.mutate(credit.id)}
              />
            </FeatureAreaGate>
          </ScreenContainer>
        </ScrollView>
      )}

      <CreditFormModal
        visible={creditFormVisible}
        credit={editingCredit}
        onClose={() => {
          setCreditFormVisible(false);
          setEditingCredit(null);
        }}
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  content: {
    paddingBottom: spacing.lg,
  },
});
