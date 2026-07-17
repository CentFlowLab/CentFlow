import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import Constants from 'expo-constants';

import { SettingsScreenLayout } from '@/components/settings/SettingsScreenLayout';
import { LegalLinksFooter } from '@/components/legal/LegalLinksFooter';
import { Card, SectionHeader, Text } from '@/components/ui';
import { useOnboarding } from '@/hooks/useOnboarding';
import { AnalyticsEvents, track } from '@/lib/analytics';
import { getAppVariant } from '@/lib/config/app-variant';
import { isOpenBankingUiEnabled } from '@/lib/config/product-features';
import { isDiagnosticsEnabled } from '@/lib/diagnostics';
import { colors, spacing } from '@/lib/theme';

type MenuItem = {
  icon: SymbolViewProps['name'];
  label: string;
  route: string;
  destructive?: boolean;
};

const MENU_SECTIONS: Array<{
  title: string;
  items: MenuItem[];
}> = [
  {
    title: 'Conta',
    items: [
      {
        icon: { ios: 'person.crop.circle', android: 'person', web: 'person' },
        label: 'Dados pessoais',
        route: '/settings/personal-data',
      },
      {
        icon: { ios: 'lock.fill', android: 'lock', web: 'lock' },
        label: 'Segurança',
        route: '/settings/security',
      },
      {
        icon: { ios: 'trash.fill', android: 'delete', web: 'delete' },
        label: 'Eliminar conta',
        route: '/settings/delete-account',
        destructive: true,
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
        icon: { ios: 'bell.fill', android: 'notifications', web: 'notifications' },
        label: 'Notificações',
        route: '/settings/notifications',
      },
      {
        icon: { ios: 'paintbrush.fill', android: 'palette', web: 'palette' },
        label: 'Aparência',
        route: '/settings/appearance',
      },
      {
        icon: { ios: 'lightbulb.fill', android: 'lightbulb', web: 'lightbulb' },
        label: 'Sugestões financeiras',
        route: '/settings/financial-suggestions',
      },
    ],
  },
  {
    title: 'Dados',
    items: [
      {
        icon: { ios: 'square.and.arrow.up', android: 'upload', web: 'upload' },
        label: 'Exportar dados',
        route: '/settings/export-data',
      },
      {
        icon: { ios: 'doc.richtext', android: 'picture_as_pdf', web: 'picture_as_pdf' },
        label: 'Exportar PDF',
        route: '/settings/export-pdf',
      },
    ],
  },
  {
    title: 'Integrações',
    items: [
      {
        icon: { ios: 'building.columns.fill', android: 'account_balance', web: 'account_balance' },
        label: 'Ligações bancárias',
        route: '/settings/bank-connections',
      },
      {
        icon: { ios: 'hand.tap.fill', android: 'touch_app', web: 'touch_app' },
        label: 'Atalhos rápidos',
        route: '/settings/shortcuts',
      },
    ],
  },
  {
    title: 'Ajuda e legal',
    items: [
      {
        icon: { ios: 'hand.raised.fill', android: 'privacy_tip', web: 'privacy_tip' },
        label: 'Privacidade',
        route: '/settings/privacy',
      },
    ],
  },
  {
    title: 'Avançado',
    items: [
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
  const variant = getAppVariant();
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  function getMenuSections() {
    const sections = MENU_SECTIONS.map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (item.route === '/settings/bank-connections' && !isOpenBankingUiEnabled()) {
          return false;
        }
        return true;
      }),
    })).filter((section) => section.items.length > 0);
    if (isDiagnosticsEnabled()) {
      sections.push({
        title: 'Desenvolvimento',
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
    <SettingsScreenLayout title="Definições" subtitle="Conta, preferências e dados">
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
                  tintColor={item.destructive ? colors.danger : colors.textSecondary}
                  size={22}
                />
                <Text
                  variant="bodyMedium"
                  color={item.destructive ? 'danger' : 'text'}
                  style={styles.menuLabel}>
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

      <Text variant="caption" color="textMuted" style={styles.version}>
        Versão {appVersion}
        {variant === 'development' || variant === 'beta' ? ` · ${variant}` : ''}
      </Text>

      <LegalLinksFooter align="left" />
    </SettingsScreenLayout>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    minHeight: 48,
  },
  menuItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  menuItemPressed: {
    opacity: 0.7,
  },
  menuLabel: {
    flex: 1,
  },
  version: {
    marginBottom: spacing.md,
    marginHorizontal: spacing.xs,
  },
});
