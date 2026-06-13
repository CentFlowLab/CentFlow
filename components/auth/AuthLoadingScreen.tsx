import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { colors, spacing } from '@/lib/theme';

type AuthLoadingScreenProps = {
  message?: string;
};

export function AuthLoadingScreen({
  message = 'A verificar sessão...',
}: AuthLoadingScreenProps) {
  return (
    <View style={styles.container}>
      <Text variant="label" color="primary" style={styles.brand}>
        CentFlow
      </Text>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text variant="caption" color="textMuted">
        {message}
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
