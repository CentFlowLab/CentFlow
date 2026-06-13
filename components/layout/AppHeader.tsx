import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { useProfile } from '@/hooks/queries/useProfile';
import { colors, radius, spacing } from '@/lib/theme';

type HeaderAction = {
  icon: React.ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
};

type AppHeaderProps = {
  title: string;
  subtitle?: string;
  showAvatar?: boolean;
  showBack?: boolean;
  onBack?: () => void;
  action?: HeaderAction;
  secondaryAction?: HeaderAction;
};

export function AppHeader({
  title,
  subtitle,
  showAvatar = true,
  showBack = false,
  onBack,
  action,
  secondaryAction,
}: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const { data: profile } = useProfile();

  const initials = profile?.avatarInitials ?? 'CF';

  function handleBack() {
    if (onBack) {
      onBack();
      return;
    }
    router.back();
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.left}>
        {showBack ? (
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
            accessibilityLabel="Voltar"
            accessibilityRole="button">
            <Text variant="h3" color="primary">
              ‹
            </Text>
          </Pressable>
        ) : null}

        <View style={styles.textGroup}>
          <Text variant="label" color="textMuted">
            CentFlow
          </Text>
          <Text variant="h1">{title}</Text>
          {subtitle ? (
            <Text variant="caption" color="textSecondary">
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.actions}>
        {secondaryAction ? (
          <Pressable
            onPress={secondaryAction.onPress}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
            accessibilityLabel={secondaryAction.accessibilityLabel}
            accessibilityRole="button">
            {secondaryAction.icon}
          </Pressable>
        ) : null}

        {action ? (
          <Pressable
            onPress={action.onPress}
            style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
            accessibilityLabel={action.accessibilityLabel}
            accessibilityRole="button">
            {action.icon}
          </Pressable>
        ) : null}

        {showAvatar ? (
          <Pressable
            onPress={() => router.push('/(tabs)/perfil')}
            style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}
            accessibilityLabel="Abrir perfil"
            accessibilityRole="button">
            <Text variant="bodyMedium" color="primary" style={styles.avatarText}>
              {initials}
            </Text>
          </Pressable>
        ) : null}
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
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
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
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
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
  avatarText: {
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
});
