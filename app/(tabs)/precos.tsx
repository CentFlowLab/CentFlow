import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import {
  CreditFormModal,
  CreditsSection,
  RegisterCreditPaymentModal,
} from '@/components/assets';
import { FeatureAreaGate } from '@/components/features';
import { AppHeader, SegmentedControl } from '@/components/layout';
import { ErrorState, LoadingSpinner, ScreenContainer } from '@/components/ui';
import { useDeleteCredit, useLiabilities } from '@/hooks/queries/useLiabilities';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { isCardCredit } from '@/lib/credit/credit-type.utils';
import type { Credit, CreditType } from '@/lib/domain/types';
import { colors, spacing } from '@/lib/theme';

type CreditTab = 'loans' | 'cards';

const CREDIT_TABS: Array<{ key: CreditTab; label: string }> = [
  { key: 'loans', label: 'Créditos' },
  { key: 'cards', label: 'Cartões de Crédito' },
];

export default function PrecosScreen() {
  const [editingCredit, setEditingCredit] = useState<Credit | null>(null);
  const [creditFormVisible, setCreditFormVisible] = useState(false);
  const [newCreditType, setNewCreditType] = useState<CreditType>('personal');
  const [paymentCredit, setPaymentCredit] = useState<Credit | null>(null);
  const [paymentVisible, setPaymentVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<CreditTab>('loans');

  const { data, isLoading, isError, error, refetch, isRefetching } = useLiabilities();
  const { contentBottomPadding } = useResponsiveLayout();
  const deleteCredit = useDeleteCredit();
  const credits = data?.credits ?? [];

  // Cartões → creditType 'card'. Restantes (incluindo sem tipo) → Créditos.
  const visibleCredits = useMemo(
    () =>
      activeTab === 'cards'
        ? credits.filter((credit) => isCardCredit(credit.creditType))
        : credits.filter((credit) => !isCardCredit(credit.creditType)),
    [credits, activeTab],
  );

  function openNewCredit() {
    setEditingCredit(null);
    setNewCreditType(activeTab === 'cards' ? 'card' : 'personal');
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
              <View style={styles.tabs}>
                <SegmentedControl
                  segments={CREDIT_TABS}
                  value={activeTab}
                  onChange={setActiveTab}
                />
              </View>

              <Animated.View key={activeTab} entering={FadeIn.duration(180)}>
                <CreditsSection
                  credits={visibleCredits}
                  variant={activeTab === 'cards' ? 'card' : 'loan'}
                  onCreate={openNewCredit}
                  onEdit={(credit) => {
                    setEditingCredit(credit);
                    setCreditFormVisible(true);
                  }}
                  onDelete={(credit) => deleteCredit.mutate(credit.id)}
                  onRegisterPayment={(credit) => {
                    setPaymentCredit(credit);
                    setPaymentVisible(true);
                  }}
                />
              </Animated.View>
            </FeatureAreaGate>
          </ScreenContainer>
        </ScrollView>
      )}

      <CreditFormModal
        visible={creditFormVisible}
        credit={editingCredit}
        initialCreditType={newCreditType}
        onClose={() => {
          setCreditFormVisible(false);
          setEditingCredit(null);
        }}
      />

      <RegisterCreditPaymentModal
        visible={paymentVisible}
        credit={paymentCredit}
        onClose={() => {
          setPaymentVisible(false);
          setPaymentCredit(null);
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
  tabs: {
    marginBottom: spacing.lg,
  },
});
