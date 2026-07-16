import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppHeader } from '@/components/layout';
import { FinancialProfileDetailSheet, FinancialProfileProgress, ProfileHubSections } from '@/components/profile';
import {
  ErrorState,
  ProfileSkeleton,
  ScreenContainer,
} from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useFinancialProfile } from '@/hooks/queries/useFinancialProfile';
import { useProfile } from '@/hooks/queries/useProfile';
import { useFeatureAreas } from '@/hooks/useFeatureAreas';
import { useDiagnosticScreen } from '@/hooks/useDiagnosticScreen';
import { useAnalytics } from '@/lib/analytics';
import type { FeatureAreaId } from '@/lib/onboarding/types';
import { colors, spacing } from '@/lib/theme';

export default function PerfilScreen() {
  useDiagnosticScreen('profile');

  const { data: profile, isLoading, isError, error, refetch, isRefetching } = useProfile();

  // Keeps analytics user context fresh when the user visits Profile
  useAnalytics();
  const { data: financialProfile, isLoading: isProfileScoreLoading } = useFinancialProfile();
  const [profileDetailVisible, setProfileDetailVisible] = useState(false);
  const { showToast } = useToast();
  const { activateFeature } = useFeatureAreas();
  const [activatingFeature, setActivatingFeature] = useState<FeatureAreaId | null>(null);

  async function handleActivateFeature(feature: FeatureAreaId) {
    setActivatingFeature(feature);
    try {
      const ok = await activateFeature(feature);
      if (ok) {
        showToast('Área activada com sucesso.', 'success');
      } else {
        showToast('Não foi possível activar esta área.', 'error');
      }
    } finally {
      setActivatingFeature(null);
    }
  }

  return (
    <View style={styles.screen}>
      <AppHeader
        variant="detail"
        title="Perfil"
        subtitle="Conta e preferências"
        showBack
        showAvatar={false}
      />

      {isLoading ? (
        <ScreenContainer applyBottomSafeInset={false}>
          <ProfileSkeleton />
        </ScreenContainer>
      ) : isError ? (
        <View style={styles.errorState}>
          <ErrorState
            context="profile"
            error={error}
            onRetry={() => refetch()}
            retryLoading={isRefetching}
          />
        </View>
      ) : (
        <ScreenContainer applyBottomSafeInset={false}>
          <ProfileHubSections
            name={profile?.name ?? 'Utilizador'}
            email={profile?.email ?? ''}
            onActivateFeature={handleActivateFeature}
            activatingFeature={activatingFeature}
            financialSlot={
              <FinancialProfileProgress
                profile={financialProfile}
                isLoading={isProfileScoreLoading}
                variant="compact"
                onPress={() => setProfileDetailVisible(true)}
              />
            }
          />

        </ScreenContainer>
      )}

      <FinancialProfileDetailSheet
        visible={profileDetailVisible}
        profile={financialProfile}
        onClose={() => setProfileDetailVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  errorState: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
});
