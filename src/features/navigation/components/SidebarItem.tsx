import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { Icon, Text, type IconName } from '@/ui/components';
import { radius, spacing, useTheme } from '@/ui/theme';

type Props = {
  label: string;
  icon: IconName;
  activeIcon: IconName;
  active: boolean;
  collapsed: boolean;
  onPress: () => void;
};

export function SidebarItem({ label, icon, activeIcon, active, collapsed, onPress }: Props) {
  const { colors } = useTheme();
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={({ pressed }) => [
        styles.item,
        collapsed && styles.collapsed,
        {
          backgroundColor: active
            ? colors.primaryMuted
            : pressed || hovered
              ? colors.surfaceHover
              : 'transparent',
        },
      ]}>
      <Icon
        name={active ? activeIcon : icon}
        size={collapsed ? 22 : 19}
        color={active ? 'primaryText' : 'textSecondary'}
      />
      {collapsed ? null : (
        <Text variant="label" tone={active ? 'accent' : 'secondary'} numberOfLines={1}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
  },
  collapsed: {
    justifyContent: 'center',
    paddingHorizontal: 0,
    minHeight: 44,
  },
});
