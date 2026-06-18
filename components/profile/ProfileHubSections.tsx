import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, Card, SectionHeader, Text } from '@/components/ui';
import { useAssets } from '@/hooks/queries/useAssets';
import { useLiabilities } from '@/hooks/queries/useLiabilities';
import { useTransactions } from '@/hooks/queries/useTransactions';
import { useProfile } from '@/hooks/queries/useProfile';
import { useUserPreferences } from '@/hooks/queries/useUserPreferences';
import { useFeatureAreas } from '@/hooks/useFeatureAreas';
import { useAuth } from '@/lib/auth';
import { FEATURE_AREA_CONFIG, ALL_FEATURE_AREAS } from '@/lib/onboarding/constants';
import type { FeatureAreaId } from '@/lib/onboarding/types';
import { getCountryLabel, getCurrencyLabel } from '@/lib/preferences/config';
import { colors, radius, spacing } from '@/lib/theme';

type ProfileHubSectionsProps = {
  name: string;
  email: string;
  onActivateFeature: (feature: FeatureAreaId) => void;
  activatingFeature?: FeatureAreaId | null;
};

function StatCell({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statCell}>
      <Text variant="h3" color="primary">
        {value}
      </Text>
      <Text variant="caption" color="textMuted" style={styles.statLabel}>
        {label}
      </Text>
    </View>
  );
}

export function ProfileHubSections({
  name,
  email,
  onActivateFeature,
  activatingFeature = null,
}: ProfileHubSectionsProps) {
  const { isAuthenticated } = useAuth();
  const { data: profile } = useProfile();
  const { data: preferences } = useUserPreferences();
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

  const region = preferences?.region ?? 'PT';
  const currency = getCurrencyLabel(profile?.currency ?? 'EUR');

  return (
    <>
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
          <View style={styles.accountRow}>
            <View style={styles.statusPill}>
              <Text variant="caption" color="primary">
                {isAuthenticated ? 'Conta activa' : 'Sessão pendente'}
              </Text>
            </View>
          </View>
        </View>
      </Card>

      <View style={styles.section}>
        <SectionHeader title="Preferências regionais" />
        <Card variant="outlined" padding="sm">
          <Pressable
            onPress={() => router.push('/settings/currency-region')}
            style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}
            accessibilityRole="button"
            accessibilityLabel="Moeda e região">
            <SymbolView
              name={{ ios: 'eurosign.circle', android: 'euro', web: 'euro' }}
              tintColor={colors.textSecondary}
              size={22}
            />
            <View style={styles.menuText}>
              <Text variant="bodyMedium">Moeda e região</Text>
              <Text variant="caption" color="textMuted">
                {currency} · {getCountryLabel(region)}
              </Text>
            </View>
            <SymbolView
              name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
              tintColor={colors.textMuted}
              size={16}
            />
          </Pressable>
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title="A tua CentFlow" />
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
                  <Button
                    label="Activar"
                    variant="ghost"
                    size="sm"
                    loading={activatingFeature === featureId}
                    disabled={activatingFeature !== null}
                    onPress={() => onActivateFeature(featureId)}
                  />
                )}
              </View>
            );
          })}
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Resumo pessoal" />
        <Card variant="outlined" style={styles.statsCard}>
          <View style={styles.statsGrid}>
            <StatCell label="Movimentos" value={transactions.length} />
            <StatCell label="Subscrições" value={activeSubscriptions} />
            <StatCell label="Objetivos" value={activeGoals} />
            <StatCell label="Garantias" value={warrantiesCount} />
            <StatCell label="Créditos" value={activeCredits} />
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
    marginBottom: spacing['2xl'],
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
  accountRow: {
    flexDirection: 'row',
    marginTop: spacing.xs,
  },
  statusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.primaryMuted,
  },
  section: {
    marginBottom: spacing['2xl'],
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  menuRowPressed: {
    backgroundColor: colors.surfaceHighlight,
  },
  menuText: {
    flex: 1,
    gap: spacing.xs,
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
  statsCard: {
    padding: spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  statCell: {
    minWidth: '28%',
    gap: spacing.xs,
  },
  statLabel: {
    maxWidth: 96,
  },
});
