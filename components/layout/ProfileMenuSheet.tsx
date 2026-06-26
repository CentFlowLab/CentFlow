import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Button, Card, Text } from '@/components/ui';
import { useProfile } from '@/hooks/queries/useProfile';
import { useAuth } from '@/lib/auth';
import { colors, radius, spacing } from '@/lib/theme';

import { DraggableBottomSheet } from './DraggableBottomSheet';

type ProfileMenuSheetProps = {
  visible: boolean;
  onClose: () => void;
};

type MenuItem = {
  id: string;
  label: string;
  icon: SymbolViewProps['name'];
  onPress: () => void;
  tone?: 'default' | 'danger';
};

export function ProfileMenuSheet({ visible, onClose }: ProfileMenuSheetProps) {
  const { data: profile } = useProfile();
  const { signOut } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const initials = profile?.avatarInitials ?? 'CF';
  const name = profile?.name ?? 'Utilizador';
  const email = profile?.email ?? '';

  async function handleSignOut() {
    onClose();
    Alert.alert('Terminar sessão', 'Tens a certeza que queres sair?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          try {
            await signOut();
          } finally {
            setLoggingOut(false);
          }
        },
      },
    ]);
  }

  const items: MenuItem[] = [
    {
      id: 'profile',
      label: 'Ver perfil',
      icon: { ios: 'person.circle', android: 'account_circle', web: 'account_circle' },
      onPress: () => {
        onClose();
        router.push('/(tabs)/perfil');
      },
    },
    {
      id: 'settings',
      label: 'Definições',
      icon: { ios: 'gearshape.fill', android: 'settings', web: 'settings' },
      onPress: () => {
        onClose();
        router.push('/settings');
      },
    },
    {
      id: 'logout',
      label: 'Sair',
      icon: { ios: 'rectangle.portrait.and.arrow.right', android: 'logout', web: 'logout' },
      onPress: handleSignOut,
      tone: 'danger',
    },
  ];

  return (
    <DraggableBottomSheet
      visible={visible}
      onClose={onClose}
      maxHeight="55%"
      scrollContentStyle={styles.content}
      header={() => (
        <View style={styles.profileHeader}>
          <View style={styles.avatarLarge}>
            <Text variant="h2" color="primary">
              {initials}
            </Text>
          </View>
          <View style={styles.profileText}>
            <Text variant="h3">{name}</Text>
            {email ? (
              <Text variant="caption" color="textSecondary">
                {email}
              </Text>
            ) : null}
          </View>
        </View>
      )}>
      <Card variant="outlined" padding="sm">
        {items.map((item, index) => (
          <Pressable
            key={item.id}
            onPress={item.onPress}
            disabled={item.id === 'logout' && loggingOut}
            style={({ pressed }) => [
              styles.menuItem,
              index < items.length - 1 && styles.menuItemBorder,
              pressed && styles.menuItemPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={item.label}>
            <SymbolView
              name={item.icon}
              tintColor={item.tone === 'danger' ? colors.danger : colors.textSecondary}
              size={22}
            />
            <Text
              variant="bodyMedium"
              color={item.tone === 'danger' ? 'danger' : undefined}
              style={styles.menuLabel}>
              {item.label}
            </Text>
            {item.id !== 'logout' ? (
              <SymbolView
                name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                tintColor={colors.textMuted}
                size={14}
              />
            ) : null}
          </Pressable>
        ))}
      </Card>

      <Button label="Fechar" variant="ghost" onPress={onClose} fullWidth />
    </DraggableBottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  avatarLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryMuted,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileText: {
    flex: 1,
    gap: spacing.xs,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuItemPressed: {
    backgroundColor: colors.surfaceHighlight,
  },
  menuLabel: {
    flex: 1,
  },
});
