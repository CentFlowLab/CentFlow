import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, Text, type IconName } from '@/ui/components';
import { layout, radius, spacing, useTheme } from '@/ui/theme';

import {
  isMoreActive,
  MOBILE_PRIMARY_ITEMS,
  NEW_TRANSACTION_HREF,
  type TabRouteName,
} from '../nav-items';

type Props = {
  activeRoute: string | undefined;
  onSelect: (route: TabRouteName) => void;
};

export function MobileTabBar({ activeRoute, onSelect }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [first, second, ...rest] = MOBILE_PRIMARY_ITEMS;
  const leading = [first, second].filter((item) => item !== undefined);

  const tab = (
    route: TabRouteName,
    label: string,
    icon: IconName,
    activeIcon: IconName,
    active: boolean,
  ) => (
    <TabButton
      key={route}
      label={label}
      icon={active ? activeIcon : icon}
      active={active}
      onPress={() => onSelect(route)}
    />
  );

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={t('nav.mainNavigation')}
      style={[
        styles.container,
        {
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      ]}>
      {leading.map((item) =>
        tab(
          item.route,
          t(`nav.${item.key}`),
          item.icon,
          item.activeIcon,
          activeRoute === item.route,
        ),
      )}

      <View style={styles.slot}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('nav.newTransaction')}
          onPress={() => router.push(NEW_TRANSACTION_HREF)}
          style={({ pressed }) => [
            styles.addButton,
            {
              backgroundColor: pressed ? colors.primaryPressed : colors.primary,
              transform: [{ scale: pressed ? 0.94 : 1 }],
            },
          ]}>
          <Icon name="add" size={26} color="onPrimary" />
        </Pressable>
      </View>

      {rest.map((item) =>
        tab(
          item.route,
          t(`nav.${item.key}`),
          item.icon,
          item.activeIcon,
          activeRoute === item.route,
        ),
      )}
      {tab(
        'more',
        t('nav.more'),
        'ellipsis-horizontal-circle-outline',
        'ellipsis-horizontal-circle',
        isMoreActive(activeRoute),
      )}
    </View>
  );
}

type TabButtonProps = {
  label: string;
  icon: IconName;
  active: boolean;
  onPress: () => void;
};

function TabButton({ label, icon, active, onPress }: TabButtonProps) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [styles.slot, styles.tab, { opacity: pressed ? 0.6 : 1 }]}>
      <Icon name={icon} size={23} color={active ? 'primaryText' : 'textTertiary'} />
      <Text variant="caption" tone={active ? 'accent' : 'tertiary'} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  slot: {
    flex: 1,
    height: layout.bottomBarHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tab: {
    gap: spacing.xxs,
  },
  addButton: {
    width: 48,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
