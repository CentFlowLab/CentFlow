import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { Button, Card, Text } from '@/components/ui';
import { useOnboardingAnswers } from '@/hooks/queries/useOnboardingAnswers';
import { getPersonalizedEmptyStateCopy } from '@/lib/onboarding/personalization';
import { colors, radius, spacing } from '@/lib/theme';

const EXAMPLE_PRODUCTS = ['Portátil', 'Frigorífico', 'Telemóvel', 'Eletrodomésticos'];

type WarrantiesEmptyStateProps = {
  onLearnMore?: () => void;
  onPrimaryAction?: () => void;
  onScanReceipt?: () => void;
  onOpenInventory?: () => void;
};

export function WarrantiesEmptyState({
  onLearnMore,
  onPrimaryAction,
  onScanReceipt,
  onOpenInventory,
}: WarrantiesEmptyStateProps) {
  const { data: answers } = useOnboardingAnswers();
  const personalized = getPersonalizedEmptyStateCopy('garantias', answers ?? null);

  const title = personalized.title || 'Não tens garantias ativas';
  const description =
    personalized.description ||
    'Os produtos com garantia expirada passam automaticamente para o Inventário. Regista novas garantias com data de expiração e associa o talão original.';
  const actionLabel = personalized.actionLabel || 'Adicionar garantia';

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.iconRing}>
          <SymbolView
            name={{ ios: 'shield.fill', android: 'verified_user', web: 'verified_user' }}
            tintColor={colors.accent}
            size={36}
          />
        </View>
        <View style={styles.alertDot} />
      </View>

      <Text variant="h2" align="center">
        {title}
      </Text>
      <Text variant="body" color="textSecondary" align="center" style={styles.description}>
        {description}
      </Text>

      <Card variant="outlined" style={styles.examplesCard}>
        <Text variant="label" color="textMuted">
          Produtos comuns
        </Text>
        <View style={styles.chipRow}>
          {EXAMPLE_PRODUCTS.map((example) => (
            <View key={example} style={styles.chip}>
              <Text variant="caption" color="textSecondary">
                {example}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      <Card variant="outlined" style={styles.highlightsCard}>
        {HIGHLIGHTS.map((item) => (
          <View key={item} style={styles.highlightRow}>
            <SymbolView
              name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
              tintColor={colors.success}
              size={16}
            />
            <Text variant="caption" color="textSecondary" style={styles.highlightText}>
              {item}
            </Text>
          </View>
        ))}
      </Card>

      <View style={styles.actions}>
        {onScanReceipt ? (
          <Button label="Digitalizar talão" onPress={onScanReceipt} fullWidth size="lg" />
        ) : null}
        {onPrimaryAction ? (
          <Button
            label={actionLabel}
            variant={onScanReceipt ? 'secondary' : 'primary'}
            onPress={onPrimaryAction}
            fullWidth
            size="lg"
          />
        ) : null}
        {onOpenInventory ? (
          <Button label="Ver inventário" variant="ghost" onPress={onOpenInventory} fullWidth />
        ) : null}
        {onLearnMore ? (
          <Button label="Porque registar garantias?" variant="ghost" onPress={onLearnMore} fullWidth />
        ) : null}
      </View>
    </View>
  );
}

const HIGHLIGHTS = [
  'Alerta vermelho 30 dias antes de expirar',
  'Associação directa ao talão digitalizado',
  'Histórico por produto e loja',
  'Integrado com alertas do dashboard',
];

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
    gap: spacing.md,
  },
  hero: {
    position: 'relative',
    marginBottom: spacing.sm,
  },
  iconRing: {
    width: 88,
    height: 88,
    borderRadius: radius.xl,
    backgroundColor: colors.accentMuted,
    borderWidth: 1.5,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.danger,
    borderWidth: 2,
    borderColor: colors.background,
  },
  description: {
    maxWidth: 320,
    lineHeight: 22,
  },
  examplesCard: {
    width: '100%',
    gap: spacing.sm,
    backgroundColor: colors.backgroundElevated,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  highlightsCard: {
    width: '100%',
    gap: spacing.sm,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  highlightText: {
    flex: 1,
    lineHeight: 18,
  },
  actions: {
    width: '100%',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
});
