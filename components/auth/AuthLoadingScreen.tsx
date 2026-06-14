import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { colors, spacing } from '@/lib/theme';

type AuthLoadingScreenProps = {
  message?: string;
};

export function AuthLoadingScreen({
  message = 'A verificar sessão...',
}: AuthLoadingScreenProps) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <Text variant="label" color="primary" style={styles.brand}>
          CentFlow
        </Text>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text variant="caption" color="textMuted">
          {message}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  brand: {
    marginBottom: spacing.sm,
  },
});
