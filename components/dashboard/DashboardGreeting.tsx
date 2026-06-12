import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { useProfile } from '@/hooks/queries/useProfile';
import { formatDateLong } from '@/lib/utils/format';
import { colors, radius, spacing } from '@/lib/theme';

export function DashboardGreeting() {
  const insets = useSafeAreaInsets();
  const { data: profile } = useProfile();

  const firstName = profile?.name?.split(' ')[0] ?? 'Utilizador';
  const initials = profile?.avatarInitials ?? 'CF';

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.textGroup}>
        <Text variant="label" color="textMuted">
          CentFlow
        </Text>
        <Text variant="h1">Olá, {firstName}</Text>
        <Text variant="caption" color="textSecondary">
          {formatDateLong()}
        </Text>
      </View>

      <Pressable
        onPress={() => router.push('/(tabs)/perfil')}
        style={({ pressed }) => [styles.avatar, pressed && styles.avatarPressed]}
        accessibilityLabel="Abrir perfil"
        accessibilityRole="button">
        <Text variant="bodyMedium" color="primary" style={styles.avatarText}>
          {initials}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    backgroundColor: colors.background,
  },
  textGroup: {
    flex: 1,
    gap: spacing.xs,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.primaryMuted,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  avatarPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  avatarText: {
    fontWeight: '700',
  },
});
