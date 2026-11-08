import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '../theme';
import { Text } from './Text';

type Props = {
  title: string;
  action?: ReactNode;
  children: ReactNode;
};

export function Section({ title, action, children }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="overline" tone="tertiary" accessibilityRole="header">
          {title}
        </Text>
        {action}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
    minHeight: 24,
  },
});
