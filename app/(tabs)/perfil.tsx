import { StyleSheet, View } from 'react-native';

import { AppHeader } from '@/components/layout';
import { ProfileHubSections } from '@/components/profile';
import {
  ErrorState,
  ProfileSkeleton,
  ScreenContainer,
} from '@/components/ui';
import { useProfile } from '@/hooks/queries/useProfile';
import { useDiagnosticScreen } from '@/hooks/useDiagnosticScreen';
import { useAnalytics } from '@/lib/analytics';
import { colors, spacing } from '@/lib/theme';

export default function PerfilScreen() {
  useDiagnosticScreen('profile');

  const { data: profile, isLoading, isError, error, refetch, isRefetching } = useProfile();

  useAnalytics();

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
          />
        </ScreenContainer>
      )}
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
