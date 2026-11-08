import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { radius, spacing, useTheme } from '../theme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

type Props = {
  icon: IconName;
  title: string;
  description?: string;
  /** Ex.: badge "Em breve" ou botão de ação principal. */
  children?: ReactNode;
};

export function EmptyState({ icon, title, description, children }: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.container} accessibilityRole="summary">
      <View style={[styles.iconRing, { backgroundColor: colors.surfaceMuted }]}>
        <View style={[styles.iconWrap, { backgroundColor: colors.primaryMuted }]}>
          <Icon name={icon} size={30} color="primaryText" />
        </View>
      </View>
      <View style={styles.texts}>
        <Text variant="title3" align="center">
          {title}
        </Text>
        {description ? (
          <Text variant="callout" tone="secondary" align="center">
            {description}
          </Text>
        ) : null}
      </View>
      {children ? <View style={styles.action}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing['4xl'],
    paddingHorizontal: spacing['2xl'],
  },
  action: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  iconRing: {
    width: 104,
    height: 104,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    gap: spacing.sm,
    maxWidth: 420,
    alignItems: 'center',
  },
});
