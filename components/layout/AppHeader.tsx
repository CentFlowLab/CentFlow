import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { colors, radius, spacing } from '@/lib/theme';

import { UserAvatarButton } from './UserAvatarButton';

type HeaderAction = {
  icon: React.ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
};

type AppHeaderProps = {
  /** Título subtil — omitir nas tabs principais para look limpo */
  title?: string;
  subtitle?: string;
  /** main = tabs (minimal); detail = sub-ecrãs com back */
  variant?: 'main' | 'detail';
  showBack?: boolean;
  onBack?: () => void;
  showBrand?: boolean;
  showAvatar?: boolean;
  /** Posição do menu de conta — esquerda nas tabs principais. */
  avatarPosition?: 'left' | 'right';
  /** Conteúdo custom à esquerda (ex: saudação no Início) */
  leading?: React.ReactNode;
  action?: HeaderAction;
  secondaryAction?: HeaderAction;
};

export function AppHeader({
  title,
  subtitle,
  variant = 'main',
  showBack = false,
  onBack,
  showBrand = variant === 'main',
  showAvatar = true,
  avatarPosition = 'left',
  leading,
  action,
  secondaryAction,
}: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const isDetail = variant === 'detail';

  function handleBack() {
    if (onBack) {
      onBack();
      return;
    }
    router.back();
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.xs }]}>
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

        {showAvatar && avatarPosition === 'left' ? <UserAvatarButton size={40} /> : null}

        {leading ? (
          <View style={styles.leading}>{leading}</View>
        ) : (
          <View style={styles.textGroup}>
            {showBrand && !isDetail ? (
              <Text variant="caption" color="textMuted" style={styles.brand}>
                CentFlow
              </Text>
            ) : null}
            {title ? (
              <Text variant={isDetail ? 'h3' : 'caption'} color={isDetail ? 'text' : 'textMuted'}>
                {title}
              </Text>
            ) : null}
            {subtitle && isDetail ? (
              <Text variant="caption" color="textSecondary">
                {subtitle}
              </Text>
            ) : null}
          </View>
        )}
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

        {showAvatar && avatarPosition === 'right' ? <UserAvatarButton size={40} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    minHeight: 52,
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 40,
  },
  leading: {
    flex: 1,
    justifyContent: 'center',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textGroup: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  brand: {
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontSize: 11,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButton: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
});
