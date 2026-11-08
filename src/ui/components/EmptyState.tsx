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
      <View style={[styles.iconWrap, { backgroundColor: colors.primaryMuted }]}>
        <Icon name={icon} size={28} color="primaryText" />
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
      {children}
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
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    gap: spacing.sm,
    maxWidth: 420,
    alignItems: 'center',
  },
});
