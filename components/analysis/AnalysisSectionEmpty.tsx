import { StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import { spacing } from '@/lib/theme';

type AnalysisSectionEmptyProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  variant?: 'elevated' | 'outlined';
};

export function AnalysisSectionEmpty({
  icon,
  title,
  description,
  variant = 'outlined',
}: AnalysisSectionEmptyProps) {
  return (
    <Card variant={variant} style={styles.card}>
      <View style={styles.iconWrap}>{icon}</View>
      <Text variant="bodyMedium" align="center">
        {title}
      </Text>
      <Text variant="caption" color="textSecondary" align="center" style={styles.description}>
        {description}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    padding: spacing.lg,
    alignItems: 'center',
  },
  iconWrap: {
    marginBottom: spacing.xs,
  },
  description: {
    lineHeight: 18,
  },
});
