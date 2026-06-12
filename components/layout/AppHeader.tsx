import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { useProfile } from '@/hooks/queries/useProfile';
import { colors, radius, spacing } from '@/lib/theme';

type AppHeaderProps = {
  title: string;
  subtitle?: string;
  showAvatar?: boolean;
  action?: {
    icon: React.ReactNode;
    onPress: () => void;
    accessibilityLabel: string;
  };
};

export function AppHeader({
  title,
  subtitle,
  showAvatar = true,
  action,
}: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const { data: profile } = useProfile();

  const initials = profile?.avatarInitials ?? 'CF';

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.textGroup}>
        <Text variant="label" color="textMuted">
          CentFlow
        </Text>
        <Text variant="h1">{title}</Text>
        {subtitle && (
          <Text variant="caption" color="textSecondary">
            {subtitle}
          </Text>
        )}
      </View>

      <View style={styles.actions}>
        {action && (
          <Pressable
            onPress={action.onPress}
            style={({ pressed }) => [styles.actionButton, pressed && styles.actionPressed]}
            accessibilityLabel={action.accessibilityLabel}
            accessibilityRole="button">
            {action.icon}
          </Pressable>
        )}

        {showAvatar && (
          <Pressable
            onPress={() => router.push('/(tabs)/perfil')}
            style={({ pressed }) => [styles.avatar, pressed && styles.avatarPressed]}
            accessibilityLabel="Abrir perfil"
            accessibilityRole="button">
            <Text variant="bodyMedium" color="primary" style={styles.avatarText}>
              {initials}
            </Text>
          </Pressable>
        )}
      </View>
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
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.primaryMuted,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
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
  },
  avatarPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  avatarText: {
    fontWeight: '700',
  },
});
