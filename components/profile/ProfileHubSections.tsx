import { router } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import Constants from 'expo-constants';
import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, SectionHeader, Text } from '@/components/ui';
import { useAssets } from '@/hooks/queries/useAssets';
import { useLiabilities } from '@/hooks/queries/useLiabilities';
import { useOnboardingAnswers } from '@/hooks/queries/useOnboardingAnswers';
import { useTransactions } from '@/hooks/queries/useTransactions';
import { useProfile } from '@/hooks/queries/useProfile';
import { useUserPreferences } from '@/hooks/queries/useUserPreferences';
import { useFeatureAreas } from '@/hooks/useFeatureAreas';
import { useAuth } from '@/lib/auth';
import { getAppVariant } from '@/lib/config/app-variant';
import { FEATURE_AREA_CONFIG, ALL_FEATURE_AREAS } from '@/lib/onboarding/constants';
import type { FeatureAreaId } from '@/lib/onboarding/types';
import { getCountryLabel, getCurrencyLabel } from '@/lib/preferences/config';
import { colors, radius, spacing } from '@/lib/theme';
import { formatDateShort } from '@/lib/utils/format';

type ProfileHubSectionsProps = {
  name: string;
  email: string;
  onActivateFeature: (feature: FeatureAreaId) => void;
  activatingFeature?: FeatureAreaId | null;
  /** Conteúdo do perfil financeiro injectado entre Conta e Preferências. */
  financialSlot?: ReactNode;
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

function StatCell({
  label,
  value,
  onPress,
}: {
  label: string;
  value: number;
  onPress?: () => void;
}) {
  const content = (
    <>
      <Text variant="h3" color="primary">
        {value}
      </Text>
      <Text variant="caption" color="textMuted" style={styles.statLabel}>
        {label}
      </Text>
    </>
  );

  if (!onPress) {
    return <View style={styles.statCell}>{content}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.statCell, pressed && styles.statCellPressed]}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}>
      {content}
    </Pressable>
  );
}

export function ProfileHubSections({
  name,
  email,
  onActivateFeature,
  activatingFeature = null,
  financialSlot,
}: ProfileHubSectionsProps) {
  const { isAuthenticated } = useAuth();
  const { data: profile } = useProfile();
  const { data: preferences } = useUserPreferences();
  const { data: onboardingAnswers } = useOnboardingAnswers();
  const { data: transactions = [] } = useTransactions('all');
  const { data: liabilities } = useLiabilities();
  const { data: assets } = useAssets();
  const { enabledFeatures, isFeatureActive } = useFeatureAreas();

  const activeSubscriptions =
    liabilities?.subscriptions.filter((item) => item.amount > 0).length ?? 0;
  const activeCredits = liabilities?.credits.length ?? 0;
  const activeGoals =
    assets?.goals.filter((goal) => goal.current < goal.target).length ?? 0;
  const warrantiesCount = assets?.warranties.length ?? 0;
  const activeFeatures = ALL_FEATURE_AREAS.filter(
    (id) => isFeatureActive(id) || enabledFeatures.includes(id),
  ).length;

  const region = preferences?.region ?? 'PT';
  const currency = getCurrencyLabel(profile?.currency ?? 'EUR');
  const memberSince = onboardingAnswers?.completedAt
    ? formatDateShort(onboardingAnswers.completedAt)
    : null;
  const planLabel = getPlanLabel();
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

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
                  {isAuthenticated ? 'Conta activa' : 'Sessão pendente'}
                </Text>
              </View>
              {memberSince ? (
                <Text variant="caption" color="textMuted">
                  Desde {memberSince}
                </Text>
              ) : null}
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
            caption="FaceID / biometria e privacidade"
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
        <SectionHeader title="A tua CentFlow" />
        <Card variant="outlined" style={styles.planCard}>
          <View style={styles.planRow}>
            <View>
              <Text variant="bodyMedium">{planLabel}</Text>
              <Text variant="caption" color="textMuted">
                {activeFeatures} de {ALL_FEATURE_AREAS.length} áreas activas · v{appVersion}
              </Text>
            </View>
            <View style={styles.planBadge}>
              <Text variant="caption" color="primary">
                Gratuito
              </Text>
            </View>
          </View>
        </Card>
        <Card variant="outlined" style={styles.featuresCard}>
          {ALL_FEATURE_AREAS.map((featureId, index) => {
            const config = FEATURE_AREA_CONFIG[featureId];
            const active = isFeatureActive(featureId) || enabledFeatures.includes(featureId);
            const isLast = index === ALL_FEATURE_AREAS.length - 1;

            return (
              <View
                key={featureId}
                style={[styles.featureRow, !isLast && styles.featureRowBorder]}>
                <Text variant="bodyMedium" style={styles.featureEmoji}>
                  {config.emoji}
                </Text>
                <View style={styles.featureText}>
                  <Text variant="bodyMedium">{config.label}</Text>
                  <Text variant="caption" color="textMuted">
                    {active ? config.description : config.activateHint}
                  </Text>
                </View>
                {active ? (
                  <View style={styles.activeDot} />
                ) : (
                  <Pressable
                    onPress={() => onActivateFeature(featureId)}
                    disabled={activatingFeature !== null}
                    style={({ pressed }) => [styles.activateLink, pressed && styles.menuRowPressed]}
                    accessibilityRole="button"
                    accessibilityLabel={`Activar ${config.label}`}>
                    <Text variant="caption" color="primary">
                      {activatingFeature === featureId ? '…' : 'Activar'}
                    </Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Estatísticas" subtitle="O teu painel pessoal" />
        <Card variant="outlined" style={styles.statsCard}>
          <View style={styles.statsGrid}>
            <StatCell
              label="Movimentos"
              value={transactions.length}
              onPress={() => router.push('/(tabs)/movimentos')}
            />
            <StatCell
              label="Objetivos"
              value={activeGoals}
              onPress={() => router.push('/(tabs)/ativos?tab=objetivos')}
            />
            <StatCell
              label="Subscrições"
              value={activeSubscriptions}
              onPress={() => router.push('/(tabs)/movimentos?view=subscricoes')}
            />
            <StatCell
              label="Garantias"
              value={warrantiesCount}
              onPress={() => router.push('/(tabs)/ativos?tab=garantias')}
            />
            <StatCell
              label="Créditos"
              value={activeCredits}
              onPress={() => router.push('/(tabs)/movimentos?view=creditos')}
            />
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
    marginBottom: spacing.xl,
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
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  planBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.primaryMuted,
  },
  featuresCard: {
    paddingVertical: spacing.xs,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  featureRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  featureEmoji: {
    width: 28,
    textAlign: 'center',
  },
  featureText: {
    flex: 1,
    gap: spacing.xs,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  activateLink: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  statsCard: {
    padding: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statCell: {
    minWidth: '28%',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  statCellPressed: {
    backgroundColor: colors.surfaceHighlight,
  },
  statLabel: {
    maxWidth: 96,
  },
});
