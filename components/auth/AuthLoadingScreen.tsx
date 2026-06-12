import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { colors, spacing } from '@/lib/theme';

export function AuthLoadingScreen() {
  return (
    <View style={styles.container}>
      <Text variant="label" color="primary" style={styles.brand}>
        CentFlow
      </Text>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text variant="caption" color="textMuted">
        A verificar sessão...
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  brand: {
    marginBottom: spacing.sm,
  },
});
