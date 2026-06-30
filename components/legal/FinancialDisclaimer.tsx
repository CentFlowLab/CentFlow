import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { FINANCIAL_DISCLAIMER } from '@/lib/config/legal';
import { colors, radius, spacing } from '@/lib/theme';

type FinancialDisclaimerProps = {
  compact?: boolean;
};

export function FinancialDisclaimer({ compact = false }: FinancialDisclaimerProps) {
  return (
    <View style={[styles.container, compact && styles.compact]}>
      <Text variant="caption" color="textMuted" style={styles.text}>
        {FINANCIAL_DISCLAIMER}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceHighlight,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  compact: {
    marginTop: spacing.md,
  },
  text: {
    lineHeight: 18,
    textAlign: 'center',
  },
});
