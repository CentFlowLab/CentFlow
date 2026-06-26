import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppHeader } from '@/components/layout';
import { FinancialProfileDetailSheet, FinancialProfileProgress, ProfileHubSections } from '@/components/profile';
import {
  Button,
  Card,
  ErrorState,
  ProfileSkeleton,
  ScreenContainer,
  SectionHeader,
  Text,
} from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useFinancialProfile } from '@/hooks/queries/useFinancialProfile';
import { useProfile } from '@/hooks/queries/useProfile';
import { useFeatureAreas } from '@/hooks/useFeatureAreas';
import { useDiagnosticScreen } from '@/hooks/useDiagnosticScreen';
import { AnalyticsEvents, track, useAnalytics } from '@/lib/analytics';
import { useAuth } from '@/lib/auth';
import type { FeatureAreaId } from '@/lib/onboarding/types';
import { colors, spacing } from '@/lib/theme';

export default function PerfilScreen() {
  useDiagnosticScreen('profile');

  const { signOut } = useAuth();
  const { data: profile, isLoading, isError, error, refetch, isRefetching } = useProfile();

  // Keeps analytics user context fresh when the user visits Profile
  useAnalytics();
  const { data: financialProfile, isLoading: isProfileScoreLoading } = useFinancialProfile();
  const [loggingOut, setLoggingOut] = useState(false);
  const [profileDetailVisible, setProfileDetailVisible] = useState(false);
  const { showToast } = useToast();
  const { activateFeature } = useFeatureAreas();
  const [activatingFeature, setActivatingFeature] = useState<FeatureAreaId | null>(null);

  async function handleActivateFeature(feature: FeatureAreaId) {
    setActivatingFeature(feature);
    try {
      await activateFeature(feature);
      showToast('Área activada com sucesso.', 'success');
    } catch {
      showToast('Não foi possível activar esta área.', 'error');
    } finally {
      setActivatingFeature(null);
    }
  }

  function handleOpenSettings() {
    track(AnalyticsEvents.SETTINGS_OPENED);
    router.push('/settings');
  }

  async function handleSignOut() {
    setLoggingOut(true);
    try {
      await signOut();
    } finally {
      setLoggingOut(false);
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
          <FinancialProfileProgress
            profile={financialProfile}
            isLoading={isProfileScoreLoading}
            variant="compact"
            style={styles.profileProgress}
            onPress={() => setProfileDetailVisible(true)}
          />

          <ProfileHubSections
            name={profile?.name ?? 'Utilizador'}
            email={profile?.email ?? ''}
            onActivateFeature={handleActivateFeature}
            activatingFeature={activatingFeature}
          />

          <View style={styles.section}>
            <SectionHeader title="Definições" />
            <Card variant="outlined" padding="sm">
              <Pressable
                onPress={handleOpenSettings}
                style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
                accessibilityRole="button"
                accessibilityLabel="Definições">
                <SymbolView
                  name={{ ios: 'gearshape.fill', android: 'settings', web: 'settings' }}
                  tintColor={colors.textSecondary}
                  size={22}
                />
                <View style={styles.menuLabel}>
                  <Text variant="bodyMedium">Definições</Text>
                  <Text variant="caption" color="textMuted">
                    Segurança, notificações, aparência e dados
                  </Text>
                </View>
                <SymbolView
                  name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                  tintColor={colors.textMuted}
                  size={16}
                />
              </Pressable>
            </Card>
          </View>

          <Button
            label="Terminar sessão"
            variant="danger"
            onPress={handleSignOut}
            loading={loggingOut}
            fullWidth
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
  profileProgress: {
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuItemPressed: {
    backgroundColor: colors.surfaceHighlight,
  },
  menuLabel: {
    flex: 1,
  },
});
