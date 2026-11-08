import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandMark, Button, IconButton, Text } from '@/ui/components';
import { layout, spacing, useTheme } from '@/ui/theme';

import { NAV_ITEMS, NEW_TRANSACTION_HREF, type NavGroup, type TabRouteName } from '../nav-items';
import { SidebarItem } from './SidebarItem';

type Props = {
  activeRoute: string | undefined;
  collapsed: boolean;
  onSelect: (route: TabRouteName) => void;
};

const MAIN_SECTIONS = [
  { group: 'overview', title: null },
  { group: 'planning', title: 'nav.groups.planning' },
  { group: 'assets', title: 'nav.groups.assets' },
] as const satisfies readonly { group: NavGroup; title: string | null }[];

export function Sidebar({ activeRoute, collapsed, onSelect }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const renderItems = (group: NavGroup) =>
    NAV_ITEMS.filter((item) => item.group === group).map((item) => (
      <SidebarItem
        key={item.key}
        label={t(`nav.${item.key}`)}
        icon={item.icon}
        activeIcon={item.activeIcon}
        active={activeRoute === item.route}
        collapsed={collapsed}
        onPress={() => onSelect(item.route)}
      />
    ));

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={t('nav.mainNavigation')}
      style={[
        styles.container,
        {
          width: collapsed ? layout.railWidth : layout.sidebarWidth,
          paddingTop: insets.top + spacing.xl,
          paddingBottom: insets.bottom + spacing.lg,
          paddingLeft: insets.left + (collapsed ? spacing.md : spacing.lg),
          paddingRight: collapsed ? spacing.md : spacing.lg,
          backgroundColor: colors.surface,
          borderRightColor: colors.border,
        },
      ]}>
      <View style={[styles.brand, collapsed && styles.centered]}>
        <BrandMark size={collapsed ? 36 : 30} />
        {collapsed ? null : <Text variant="title3">{t('app.name')}</Text>}
      </View>

      <View style={collapsed ? styles.centered : undefined}>
        {collapsed ? (
          <IconButton
            icon="add"
            variant="filled"
            color="primaryText"
            accessibilityLabel={t('nav.newTransaction')}
            onPress={() => router.push(NEW_TRANSACTION_HREF)}
          />
        ) : (
          <Button
            label={t('nav.newTransaction')}
            icon="add"
            fullWidth
            onPress={() => router.push(NEW_TRANSACTION_HREF)}
          />
        )}
      </View>

      <View style={styles.groups}>
        {MAIN_SECTIONS.map(({ group, title }) => (
          <View key={group} style={styles.group}>
            {title && !collapsed ? (
              <Text variant="overline" tone="tertiary" style={styles.groupTitle}>
                {t(title)}
              </Text>
            ) : null}
            {renderItems(group)}
          </View>
        ))}
      </View>

      <View style={styles.footer}>{renderItems('system')}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: '100%',
    borderRightWidth: StyleSheet.hairlineWidth,
    gap: spacing['2xl'],
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    paddingHorizontal: spacing.xs,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  groups: {
    flex: 1,
    gap: spacing.xl,
  },
  group: {
    gap: spacing.xxs,
  },
  groupTitle: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },
  footer: {
    gap: spacing.xxs,
  },
});
