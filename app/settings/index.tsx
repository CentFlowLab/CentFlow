import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { SettingsScreenLayout } from '@/components/settings/SettingsScreenLayout';
import { Card, SectionHeader, Text } from '@/components/ui';
import { useOnboarding } from '@/hooks/useOnboarding';
import { AnalyticsEvents, track } from '@/lib/analytics';
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
    title: 'Conta e app',
    items: [
      {
        icon: { ios: 'lock.fill', android: 'lock', web: 'lock' },
        label: 'Segurança',
        route: '/settings/security',
      },
      {
        icon: { ios: 'bell.fill', android: 'notifications', web: 'notifications' },
        label: 'Notificações',
        route: '/settings/notifications',
      },
      {
        icon: { ios: 'lightbulb.fill', android: 'lightbulb', web: 'lightbulb' },
        label: 'Sugestões financeiras',
        route: '/settings/financial-suggestions',
      },
      {
        icon: { ios: 'paintbrush.fill', android: 'palette', web: 'palette' },
        label: 'Aparência',
        route: '/settings/appearance',
      },
      {
        icon: { ios: 'hand.tap.fill', android: 'touch_app', web: 'touch_app' },
        label: 'Atalhos rápidos',
        route: '/settings/shortcuts',
      },
      {
        icon: { ios: 'hand.raised.fill', android: 'privacy_tip', web: 'privacy_tip' },
        label: 'Privacidade',
        route: '/settings/privacy',
      },
    ],
  },
  {
    title: 'Dados',
    items: [
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
      {
        icon: { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' },
        label: 'Repetir onboarding',
        route: '__redo_onboarding__',
      },
    ],
  },
];

export default function SettingsIndexScreen() {
  const { reset: resetOnboarding } = useOnboarding();
  const [resettingOnboarding, setResettingOnboarding] = useState(false);

  function getMenuSections() {
    const sections = [...MENU_SECTIONS];
    if (isDiagnosticsEnabled()) {
      sections.push({
        title: 'Testes',
        items: [
          {
            icon: { ios: 'ladybug.fill', android: 'bug_report', web: 'bug_report' },
            label: 'CentFlow Doctor',
            route: '/settings/diagnostics',
          },
        ],
      });
    }
    return sections;
  }

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
    track(AnalyticsEvents.SETTINGS_OPENED);
    router.push(route as never);
  }

  return (
    <SettingsScreenLayout title="Definições" subtitle="Preferências da app e da conta">
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
                <SymbolView name={item.icon} tintColor={colors.textSecondary} size={22} />
                <Text variant="bodyMedium" style={styles.menuLabel}>
                  {item.label}
                </Text>
                <SymbolView
                  name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                  tintColor={colors.textMuted}
                  size={16}
                />
              </Pressable>
            ))}
          </Card>
        </View>
      ))}
    </SettingsScreenLayout>
  );
}

const styles = StyleSheet.create({
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
