import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import { colors, spacing } from '@/lib/theme';

type MetricCardProps = {
  label: string;
  value: string;
  subtitle?: string;
  icon: SymbolViewProps['name'];
  iconColor?: string;
  valueColor?: string;
};

export function MetricCard({
  label,
  value,
  subtitle,
  icon,
  iconColor = colors.primary,
  valueColor,
}: MetricCardProps) {
  return (
    <Card variant="elevated" style={styles.card}>
      <View style={[styles.iconBox, { backgroundColor: `${iconColor}20` }]}>
        <SymbolView name={icon} tintColor={iconColor} size={20} />
      </View>
      <Text variant="label" color="textMuted" style={styles.label}>
        {label}
      </Text>
      <Text
        variant="h3"
        color={valueColor ? undefined : 'text'}
        style={valueColor ? { color: valueColor } : undefined}>
        {value}
      </Text>
      {subtitle && (
        <Text variant="caption" color="textMuted">
          {subtitle}
        </Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '30%',
    gap: spacing.xs,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  label: {
    marginBottom: spacing.xs,
  },
});
