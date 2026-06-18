import { Link, router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { AuthScreenLayout } from '@/components/auth';
import { Button, Card, Text } from '@/components/ui';
import { spacing } from '@/lib/theme';

export default function PasswordResetSuccessScreen() {
  return (
    <AuthScreenLayout
      title="Password actualizada"
      subtitle="A tua conta está protegida com a nova palavra-passe">
      <Card variant="elevated" padding="md" style={styles.card}>
        <Text variant="bodyMedium">Tudo pronto.</Text>
        <Text variant="caption" color="textSecondary">
          Podes iniciar sessão com a nova palavra-passe.
        </Text>
      </Card>

      <Button label="Ir para login" onPress={() => router.replace('/(auth)/login')} fullWidth size="lg" />

      <Link href="/(tabs)" asChild>
        <Pressable>
          <Text variant="bodyMedium" color="primary" style={styles.link}>
            Continuar na app
          </Text>
        </Pressable>
      </Link>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  link: {
    textAlign: 'center',
    fontWeight: '600',
  },
});
