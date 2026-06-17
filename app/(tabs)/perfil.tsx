import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppHeader } from '@/components/layout';
import { FinancialProfileDetailSheet, FinancialProfileProgress } from '@/components/profile';
import {
  Button,
  Card,
  ErrorState,
  ProfileSkeleton,
  ScreenContainer,
  SectionHeader,
  Text,
} from '@/components/ui';
import { useFinancialProfile } from '@/hooks/queries/useFinancialProfile';
import { useProfile } from '@/hooks/queries/useProfile';
import { useOnboarding } from '@/hooks/useOnboarding';
import { AnalyticsEvents, track, useAnalytics } from '@/lib/analytics';
import { useAuth } from '@/lib/auth';
import { isDiagnosticsEnabled } from '@/lib/diagnostics';
import { colors, spacing } from '@/lib/theme';

type MenuItem = {
  icon: SymbolViewProps['name'];
  label: string;
  route: string;
};

const MENU_SECTIONS: Array<{
  title: string;
  items: MenuItem[];
}> = [
  {
    title: 'Notificações',
    items: [
      {
        icon: { ios: 'bell.fill', android: 'notifications', web: 'notifications' },
        label: 'Notificações',
        route: '/settings/notifications',
      },
    ],
  },
  {
    title: 'Preferências',
    items: [
      {
        icon: { ios: 'eurosign.circle', android: 'euro', web: 'euro' },
        label: 'Moeda e região',
        route: '/settings/currency-region',
      },
      {
        icon: { ios: 'paintbrush.fill', android: 'palette', web: 'palette' },
        label: 'Aparência',
        route: '/settings/appearance',
      },
      {
        icon: { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' },
        label: 'Repetir onboarding',
        route: '__redo_onboarding__',
      },
    ],
  },
  {
    title: 'Segurança & Dados',
    items: [
      {
        icon: { ios: 'lock.fill', android: 'lock', web: 'lock' },
        label: 'Segurança',
        route: '/settings/security',
      },
      {
        icon: { ios: 'doc.richtext', android: 'picture_as_pdf', web: 'picture_as_pdf' },
        label: 'Exportar PDF',
        route: '/settings/export-pdf',
      },
      {
        icon: { ios: 'square.and.arrow.up', android: 'upload', web: 'upload' },
        label: 'Exportar dados',
        route: '/settings/export-data',
      },
    ],
  },
];

function getMenuSections() {
  const sections = [...MENU_SECTIONS];
  if (isDiagnosticsEnabled()) {
    sections.push({
      title: 'Testes',
      items: [
        {
          icon: { ios: 'ladybug.fill', android: 'bug_report', web: 'bug_report' },
          label: 'Log de diagnóstico',
          route: '/settings/diagnostics',
        },
      ],
    });
  }
  return sections;
}

export default function PerfilScreen() {
  const { signOut } = useAuth();
  const { reset: resetOnboarding } = useOnboarding();
  const { data: profile, isLoading, isError, error, refetch, isRefetching } = useProfile();

  // Keeps analytics user context fresh when the user visits Profile
  useAnalytics();
  const { data: financialProfile, isLoading: isProfileScoreLoading } = useFinancialProfile();
  const [loggingOut, setLoggingOut] = useState(false);
  const [profileDetailVisible, setProfileDetailVisible] = useState(false);
  const [resettingOnboarding, setResettingOnboarding] = useState(false);

  function handleRedoOnboarding() {
    Alert.alert(
      'Repetir onboarding?',
      'Voltas a responder às perguntas de personalização. Os teus dados financeiros não são afectados.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Repetir',
          onPress: () => {
            setResettingOnboarding(true);
            void resetOnboarding()
              .then(() => router.replace('/onboarding'))
              .finally(() => setResettingOnboarding(false));
          },
        },
      ],
    );
  }

  function handleMenuPress(route: string) {
    if (route === '__redo_onboarding__') {
      handleRedoOnboarding();
      return;
    }

    if (route.startsWith('/settings')) {
      track(AnalyticsEvents.SETTINGS_OPENED);
    }

    router.push(route as never);
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
        <ScreenContainer>
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
        <ScreenContainer>
          <FinancialProfileProgress
            profile={financialProfile}
            isLoading={isProfileScoreLoading}
            variant="full"
            style={styles.profileProgress}
            onPress={() => setProfileDetailVisible(true)}
          />

          <Card variant="elevated" style={styles.profileCard}>
            <View style={styles.avatarLarge}>
              <Text variant="h2" color="primary">
                {profile?.avatarInitials ?? 'CF'}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text variant="h3">{profile?.name ?? 'Utilizador'}</Text>
              <Text variant="caption" color="textSecondary">
                {profile?.email ?? ''}
              </Text>
            </View>
          </Card>

          {getMenuSections().map((section) => (
            <View key={section.title} style={styles.section}>
              <SectionHeader title={section.title} />
              <Card variant="outlined" padding="sm">
                {section.items.map((item, itemIndex) => (
                  <Pressable
                    key={item.label}
                    onPress={() => handleMenuPress(item.route)}
                    disabled={item.route === '__redo_onboarding__' && resettingOnboarding}
                    style={({ pressed }) => [
                      styles.menuItem,
                      itemIndex < section.items.length - 1 && styles.menuItemBorder,
                      pressed && styles.menuItemPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={item.label}>
                    <SymbolView
                      name={item.icon}
                      tintColor={colors.textSecondary}
                      size={22}
                    />
                    <Text variant="bodyMedium" style={styles.menuLabel}>
                      {item.label}
                    </Text>
                    <SymbolView
                      name={{
                        ios: 'chevron.right',
                        android: 'chevron_right',
                        web: 'chevron_right',
                      }}
                      tintColor={colors.textMuted}
                      size={16}
                    />
                  </Pressable>
                ))}
              </Card>
            </View>
          ))}

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
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing['2xl'],
  },
  profileProgress: {
    marginBottom: spacing['2xl'],
  },
  avatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  profileInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  section: {
    marginBottom: spacing['2xl'],
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
