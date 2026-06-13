import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { Text } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useProfile } from '@/hooks/queries/useProfile';
import { colors, radius } from '@/lib/theme';

import { ProfileMenuSheet } from './ProfileMenuSheet';

type UserAvatarButtonProps = {
  size?: number;
  onPress?: () => void;
  /** Abre o menu de perfil por defeito */
  openMenu?: boolean;
};

export function UserAvatarButton({
  size = 40,
  onPress,
  openMenu = true,
}: UserAvatarButtonProps) {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const [menuVisible, setMenuVisible] = useState(false);

  const initials = profile?.avatarInitials ?? user?.avatarInitials ?? 'CF';

  function handlePress() {
    if (onPress) {
      onPress();
      return;
    }
    if (openMenu) {
      setMenuVisible(true);
    }
  }

  return (
    <>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.avatar,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
          pressed && styles.pressed,
        ]}
        accessibilityLabel="Menu de perfil"
        accessibilityRole="button">
        <Text variant="caption" color="primary" style={styles.initials}>
          {initials}
        </Text>
      </Pressable>

      {openMenu ? (
        <ProfileMenuSheet visible={menuVisible} onClose={() => setMenuVisible(false)} />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: colors.primaryMuted,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontWeight: '700',
    fontSize: 13,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
});
