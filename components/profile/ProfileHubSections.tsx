import { router } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import Constants from 'expo-constants';
import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, SectionHeader, Text } from '@/components/ui';
import { useProfile } from '@/hooks/queries/useProfile';
import { useUserPreferences } from '@/hooks/queries/useUserPreferences';
import { useAuth } from '@/lib/auth';
import { getAppVariant } from '@/lib/config/app-variant';
import { getCountryLabel, getCurrencyLabel } from '@/lib/preferences/config';
import { colors, radius, spacing } from '@/lib/theme';

type ProfileHubSectionsProps = {
  name: string;
  email: string;
  /** Slot opcional entre Conta e Preferências (ex.: conteúdo futuro). */
  financialSlot?: ReactNode;
  /** Mantido por compatibilidade — catálogo de áreas removido da UI. */
  onActivateFeature?: (feature: never) => void;
  activatingFeature?: null;
};

function PreferenceRow({
  icon,
  label,
  caption,
  onPress,
  withBorder,
}: {
  icon: SymbolViewProps['name'];
  label: string;
  caption: string;
  onPress: () => void;
  withBorder?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuRow,
        withBorder && styles.menuRowBorder,
        pressed && styles.menuRowPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}>
      <SymbolView name={icon} tintColor={colors.textSecondary} size={22} />
      <View style={styles.menuText}>
        <Text variant="bodyMedium">{label}</Text>
        <Text variant="caption" color="textMuted">
          {caption}
        </Text>
      </View>
      <SymbolView
        name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
        tintColor={colors.textMuted}
        size={16}
      />
    </Pressable>
  );
}

function getPlanLabel(): string {
  const variant = getAppVariant();
  if (variant === 'beta') return 'CentFlow Beta';
  if (variant === 'development') return 'CentFlow Dev';
  return 'CentFlow';
}

export function ProfileHubSections({
  name,
  email,
  financialSlot,
}: ProfileHubSectionsProps) {
  const { isAuthenticated } = useAuth();
  const { data: profile } = useProfile();
  const { data: preferences } = useUserPreferences();

  const region = preferences?.region ?? 'PT';
  const currency = getCurrencyLabel(profile?.currency ?? 'EUR');
  const planLabel = getPlanLabel();
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';
  const variant = getAppVariant();

  return (
    <>
      <View style={styles.section}>
        <SectionHeader title="Conta" />
        <Card variant="elevated" style={styles.identityCard}>
          <View style={styles.avatarLarge}>
            <Text variant="h2" color="primary">
              {name
                .split(' ')
                .map((part) => part[0])
                .join('')
                .slice(0, 2)
                .toUpperCase() || 'CF'}
            </Text>
          </View>
          <View style={styles.identityInfo}>
            <Text variant="h3">{name}</Text>
            <Text variant="caption" color="textSecondary">
              {email}
            </Text>
            <View style={styles.metaRow}>
              <View style={styles.statusPill}>
                <Text variant="caption" color="primary">
                  {isAuthenticated ? 'Conta ativa' : 'Sessão pendente'}
                </Text>
              </View>
            </View>
          </View>
        </Card>
        <Card variant="outlined" padding="sm">
          <PreferenceRow
            icon={{ ios: 'person.crop.circle', android: 'person', web: 'person' }}
            label="Editar dados pessoais"
            caption="Nome, email e conta"
            onPress={() => router.push('/settings/personal-data')}
          />
          <PreferenceRow
            icon={{ ios: 'gearshape.fill', android: 'settings', web: 'settings' }}
            label="Definições"
            caption="Segurança, exportações e preferências"
            onPress={() => router.push('/settings')}
            withBorder
          />
        </Card>
      </View>

      {financialSlot ? <View style={styles.section}>{financialSlot}</View> : null}

      <View style={styles.section}>
        <SectionHeader title="Preferências" />
        <Card variant="outlined" padding="sm">
          <PreferenceRow
            icon={{ ios: 'eurosign.circle', android: 'euro', web: 'euro' }}
            label="Moeda e região"
            caption={`${currency} · ${getCountryLabel(region)}`}
            onPress={() => router.push('/settings/currency-region')}
          />
          <PreferenceRow
            icon={{ ios: 'bell.fill', android: 'notifications', web: 'notifications' }}
            label="Notificações"
            caption="Alertas e lembretes"
            onPress={() => router.push('/settings/notifications')}
            withBorder
          />
          <PreferenceRow
            icon={{ ios: 'lock.fill', android: 'lock', web: 'lock' }}
            label="Segurança"
            caption="Biometria e sessões"
            onPress={() => router.push('/settings/security')}
            withBorder
          />
          <PreferenceRow
            icon={{ ios: 'paintbrush.fill', android: 'palette', web: 'palette' }}
            label="Aparência"
            caption="Tema da aplicação"
            onPress={() => router.push('/settings/appearance')}
            withBorder
          />
        </Card>
      </View>

      <View style={styles.section}>
        <Card variant="outlined" style={styles.planCard}>
          <View style={styles.planRow}>
            <View>
              <Text variant="bodyMedium">{planLabel}</Text>
              <Text variant="caption" color="textMuted">
                Versão {appVersion}
                {variant === 'development' ? ' · desenvolvimento' : ''}
              </Text>
            </View>
          </View>
        </Card>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  avatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  identityInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  statusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.primaryMuted,
  },
  section: {
    marginBottom: spacing.xl,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
    minHeight: 48,
  },
  menuRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  menuRowPressed: {
    backgroundColor: colors.surfaceHighlight,
  },
  menuText: {
    flex: 1,
    gap: spacing.xs,
  },
  planCard: {
    padding: spacing.md,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
});
