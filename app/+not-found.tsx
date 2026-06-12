import { Link, Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button, Text } from '@/components/ui';
import { colors, spacing } from '@/lib/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Página não encontrada' }} />
      <View style={styles.container}>
        <Text variant="h1">404</Text>
        <Text variant="body" color="textSecondary" align="center">
          Esta página não existe no CentFlow.
        </Text>
        <Link href="/" asChild>
          <Button label="Voltar ao início" style={styles.button} />
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing['2xl'],
    gap: spacing.lg,
  },
  button: {
    marginTop: spacing.lg,
  },
});
