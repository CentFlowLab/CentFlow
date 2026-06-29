import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Button, Card, Text } from '@/components/ui';
import { useProfile } from '@/hooks/queries/useProfile';
import { useUserPreferences } from '@/hooks/queries/useUserPreferences';
import { useAuth } from '@/lib/auth';
import { getCountryLabel, getCurrencyLabel } from '@/lib/preferences/config';
import { colors, radius, spacing } from '@/lib/theme';

import { DraggableBottomSheet } from './DraggableBottomSheet';

type ProfileMenuSheetProps = {
  visible: boolean;
  onClose: () => void;
};

type MenuItem = {
  id: string;
  label: string;
  caption?: string;
  icon: SymbolViewProps['name'];
  onPress: () => void;
  tone?: 'default' | 'danger';
};

export function ProfileMenuSheet({ visible, onClose }: ProfileMenuSheetProps) {
  const { data: profile } = useProfile();
  const { data: preferences } = useUserPreferences();
  const { signOut } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const initials = profile?.avatarInitials ?? 'CF';
  const name = profile?.name ?? 'Utilizador';
  const email = profile?.email ?? '';
  const region = preferences?.region ?? 'PT';
  const currencyCaption = `${getCurrencyLabel(profile?.currency ?? 'EUR')} · ${getCountryLabel(region)}`;

  function navigate(path: string) {
    onClose();
    router.push(path as never);
  }

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
      id: 'personal',
      label: 'Dados pessoais',
      caption: 'Nome e email',
      icon: { ios: 'person.crop.circle', android: 'person', web: 'person' },
      onPress: () => navigate('/settings/personal-data'),
    },
    {
      id: 'currency',
      label: 'Moeda e região',
      caption: currencyCaption,
      icon: { ios: 'eurosign.circle', android: 'euro', web: 'euro' },
      onPress: () => navigate('/settings/currency-region'),
    },
    {
      id: 'appearance',
      label: 'Aparência',
      caption: 'Tema da aplicação',
      icon: { ios: 'paintbrush.fill', android: 'palette', web: 'palette' },
      onPress: () => navigate('/settings/appearance'),
    },
    {
      id: 'notifications',
      label: 'Notificações',
      caption: 'Alertas e lembretes',
      icon: { ios: 'bell.fill', android: 'notifications', web: 'notifications' },
      onPress: () => navigate('/settings/notifications'),
    },
    {
      id: 'security',
      label: 'Segurança',
      caption: 'Biometria e sessão',
      icon: { ios: 'lock.fill', android: 'lock', web: 'lock' },
      onPress: () => navigate('/settings/security'),
    },
    {
      id: 'privacy',
      label: 'Privacidade',
      caption: 'Dados e consentimentos',
      icon: { ios: 'hand.raised.fill', android: 'privacy_tip', web: 'privacy_tip' },
      onPress: () => navigate('/settings/privacy'),
    },
    {
      id: 'shortcuts',
      label: 'Atalhos rápidos',
      caption: 'Gasto rápido no telemóvel',
      icon: { ios: 'hand.tap.fill', android: 'touch_app', web: 'touch_app' },
      onPress: () => navigate('/settings/shortcuts'),
    },
    {
      id: 'plan',
      label: 'Plano financeiro',
      caption: 'Visão do mês e acções',
      icon: { ios: 'calendar', android: 'calendar_today', web: 'calendar_today' },
      onPress: () => navigate('/financial-plan'),
    },
    {
      id: 'logout',
      label: 'Terminar sessão',
      icon: { ios: 'rectangle.portrait.and.arrow.right', android: 'logout', web: 'logout' },
      onPress: handleSignOut,
      tone: 'danger',
    },
  ];

  return (
    <DraggableBottomSheet
      visible={visible}
      onClose={onClose}
      maxHeight="85%"
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
            <View style={styles.menuLabelBlock}>
              <Text
                variant="bodyMedium"
                color={item.tone === 'danger' ? 'danger' : undefined}
                style={styles.menuLabel}>
                {item.label}
              </Text>
              {item.caption ? (
                <Text variant="caption" color="textMuted">
                  {item.caption}
                </Text>
              ) : null}
            </View>
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
  menuLabelBlock: {
    flex: 1,
    gap: 2,
  },
  menuLabel: {
    flex: 1,
  },
});
