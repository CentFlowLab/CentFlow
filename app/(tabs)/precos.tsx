import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { CreditFormModal, CreditsSection } from '@/components/assets';
import { FeatureAreaGate } from '@/components/features';
import { AppHeader } from '@/components/layout';
import { ErrorState, LoadingSpinner, ScreenContainer } from '@/components/ui';
import { useDeleteCredit, useLiabilities } from '@/hooks/queries/useLiabilities';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import type { Credit } from '@/lib/domain/types';
import { colors, spacing } from '@/lib/theme';

export default function PrecosScreen() {
  const [editingCredit, setEditingCredit] = useState<Credit | null>(null);
  const [creditFormVisible, setCreditFormVisible] = useState(false);

  const { data, isLoading, isError, error, refetch, isRefetching } = useLiabilities();
  const { contentBottomPadding } = useResponsiveLayout();
  const deleteCredit = useDeleteCredit();
  const credits = data?.credits ?? [];

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
          accessibilityLabel: 'Novo crédito',
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
      ) : isLoading && !data ? (
        <View style={styles.centered}>
          <LoadingSpinner message="A carregar créditos..." />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: contentBottomPadding },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => refetch()}
              tintColor={colors.primary}
            />
          }>
          <ScreenContainer scrollable={false} applyBottomSafeInset={false}>
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
