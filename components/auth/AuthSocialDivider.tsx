import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { colors, spacing } from '@/lib/theme';

export function AuthSocialDivider() {
  return (
    <View style={styles.container}>
      <View style={styles.line} />
      <Text variant="caption" color="textMuted" style={styles.label}>
        ou
      </Text>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.sm,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  label: {
    textTransform: 'lowercase',
  },
});
