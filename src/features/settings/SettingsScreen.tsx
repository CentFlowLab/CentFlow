import Constants from 'expo-constants';
import { Link, Redirect, router, Stack, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AccountSettingsPage } from '@/features/account/AccountSettings';
import { useAuth } from '@/features/account/AuthProvider';
import { useSync } from '@/features/account/SyncProvider';
import { usePreferences } from '@/features/preferences';
import { LANGUAGE_META } from '@/i18n';
import { Icon, IconButton, ListItem, Screen, Text } from '@/ui/components';
import { useBreakpoint } from '@/ui/layout/useBreakpoint';
import { layout, radius, spacing, useTheme } from '@/ui/theme';

import { DataPage } from './DataPage';
import { AboutPage, HelpPage } from './HelpAboutPages';
import { IntegrationsPage } from './IntegrationsPage';
import { PreferencesPage } from './PreferencesPage';
import { SettingsGroup } from './SettingsBlocks';
import {
  isSettingsSection,
  SECTION_ICONS,
  SETTINGS_SECTIONS,
  settingsHref,
  type SettingsSection,
} from './settings-sections';

/** Largura da coluna de secções em tablet e desktop. */
const NAV_WIDTH = 240;
/** Largura de leitura do painel: as linhas não esticam até ao fim do ecrã. */
const PANEL_MAX_WIDTH = 760;

const PAGES: Record<SettingsSection, () => ReactNode> = {
  account: () => <AccountSettingsPage />,
  preferences: () => <PreferencesPage />,
  data: () => <DataPage />,
  integrations: () => <IntegrationsPage />,
  help: () => <HelpPage />,
  about: () => <AboutPage />,
};

/** Pilha própria das Definições: no telemóvel, cada secção abre por cima da lista. */
export function SettingsStack() {
  const { colors } = useTheme();
  const breakpoint = useBreakpoint();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // Em tablet e desktop a coluna de secções fica fixa: mudar de secção não desliza.
        animation: breakpoint === 'compact' ? 'default' : 'none',
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}

/** Rota `/settings/[section]`: secção desconhecida volta ao início das Definições. */
export function SettingsSectionRoute() {
  const { section } = useLocalSearchParams<{ section?: string }>();
  if (!isSettingsSection(section)) return <Redirect href="/settings" />;
  return <SettingsScreen section={section} />;
}

/**
 * Definições com navegação interna (ADR-071). Tablet e desktop: coluna de secções à esquerda e a
 * secção escolhida à direita (sem secção, abre a Conta). Telemóvel: lista de secções; cada uma
 * abre numa página própria, com regresso à lista. Cada secção tem o seu endereço.
 */
export function SettingsScreen({ section = null }: { section?: SettingsSection | null }) {
  const { t } = useTranslation();
  const breakpoint = useBreakpoint();

  if (breakpoint === 'compact') {
    if (!section) {
      return (
        <Screen title={t('settings.title')}>
          <SectionList />
        </Screen>
      );
    }
    return (
      <Screen>
        <BackToSettings />
        <View style={styles.page}>{PAGES[section]()}</View>
      </Screen>
    );
  }

  const current = section ?? 'account';
  return (
    <Screen title={t('settings.title')}>
      <View style={styles.split}>
        <SectionNav current={current} compactRail={breakpoint === 'medium'} />
        <View style={styles.panel}>{PAGES[current]()}</View>
      </View>
    </Screen>
  );
}

/** Resumo de cada secção na lista do telemóvel: o estado atual, quando ajuda a decidir. */
function useSectionSummaries(): Record<SettingsSection, string> {
  const { t } = useTranslation();
  const { state } = useAuth();
  const { snapshot } = useSync();
  const { preferences } = usePreferences();
  const language =
    preferences.language === 'system'
      ? t('settings.languageSystem')
      : LANGUAGE_META[preferences.language].nativeName;
  const user = state.status === 'signedIn' ? state.user : null;
  return {
    account: user
      ? (user.email ?? user.username ?? t('account.signedIn'))
      : t('account.localOnlyTitle'),
    preferences: `${t(`settings.theme.${preferences.theme}`)} · ${language}`,
    data: snapshot
      ? t(`account.statusShort.${snapshot.status}`)
      : t('settings.sections.data.description'),
    integrations: t('settings.sections.integrations.description'),
    help: t('settings.sections.help.description'),
    about: `${t('settings.version')} ${Constants.expoConfig?.version ?? '—'}`,
  };
}

/** Telemóvel: as secções como uma lista, com o estado atual em cada linha. */
function SectionList() {
  const { t } = useTranslation();
  const summaries = useSectionSummaries();
  return (
    <SettingsGroup>
      {SETTINGS_SECTIONS.map((key) => (
        <ListItem
          key={key}
          icon={SECTION_ICONS[key]}
          iconColor="primaryText"
          iconBackground="primaryMuted"
          title={t(`settings.sections.${key}.title`)}
          subtitle={summaries[key]}
          onPress={() => router.push(settingsHref(key))}
        />
      ))}
    </SettingsGroup>
  );
}

/** Telemóvel: regresso à lista de secções (o mesmo que o botão de voltar do sistema). */
function BackToSettings() {
  const { t } = useTranslation();
  return (
    <View style={styles.back}>
      <IconButton
        icon="chevron-back"
        accessibilityLabel={t('settings.nav.back')}
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/settings'))}
      />
      <Text variant="label" tone="secondary">
        {t('settings.title')}
      </Text>
    </View>
  );
}

/**
 * Tablet e desktop: navegação secundária das Definições. Ligações reais (endereço próprio,
 * teclado, voltar do browser); a secção atual fica marcada para leitores de ecrã.
 */
function SectionNav({ current, compactRail }: { current: SettingsSection; compactRail: boolean }) {
  const { t } = useTranslation();
  return (
    <View
      style={[styles.nav, compactRail && styles.navMedium]}
      accessibilityRole="navigation"
      aria-label={t('settings.nav.label')}>
      {SETTINGS_SECTIONS.map((key) => (
        <NavItem
          key={key}
          section={key}
          label={t(`settings.sections.${key}.title`)}
          active={key === current}
        />
      ))}
    </View>
  );
}

function NavItem({
  section,
  label,
  active,
}: {
  section: SettingsSection;
  label: string;
  active: boolean;
}) {
  const { colors } = useTheme();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <Link href={settingsHref(section)} asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={label}
        accessibilityState={{ selected: active }}
        aria-current={active ? 'page' : undefined}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        // Um só objeto de estilo: o `Link` com `asChild` não aceita funções nem listas.
        style={StyleSheet.flatten([
          styles.navItem,
          active && { backgroundColor: colors.primaryMuted },
          !active && hovered && { backgroundColor: colors.surfaceHover },
          // Foco do teclado visível (web): contorno na cor principal.
          focused && { borderColor: colors.primary },
        ])}>
        <Icon
          name={SECTION_ICONS[section]}
          size={20}
          color={active ? 'primaryText' : 'textSecondary'}
        />
        <Text
          variant="label"
          tone={active ? 'accent' : 'secondary'}
          numberOfLines={2}
          style={styles.navLabel}>
          {label}
        </Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  split: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing['3xl'],
  },
  nav: {
    width: NAV_WIDTH,
    gap: spacing.xxs,
    // Fica à vista enquanto o painel rola (web); no nativo é ignorado.
    position: 'sticky' as never,
    top: spacing.lg,
  },
  navMedium: {
    width: 216,
  },
  navItem: {
    // Borda sempre presente (transparente) para o contorno de foco não mexer no texto.
    borderWidth: 2,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: layout.minTouchTarget,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
  },
  navLabel: {
    flex: 1,
  },
  panel: {
    flex: 1,
    minWidth: 0,
    maxWidth: PANEL_MAX_WIDTH,
    gap: spacing['2xl'],
  },
  page: {
    gap: spacing['2xl'],
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginLeft: -spacing.sm,
    marginBottom: -spacing.md,
  },
});
