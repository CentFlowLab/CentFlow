import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { Button, Card, Text } from '@/components/ui';
import { useOnboardingAnswers } from '@/hooks/queries/useOnboardingAnswers';
import { getPersonalizedEmptyStateCopy } from '@/lib/onboarding/personalization';
import { colors, radius, spacing } from '@/lib/theme';

const EXAMPLE_GOALS = [
  'Fundo de emergência',
  'Viagem',
  'Entrada casa',
  'Novo portátil',
];

type GoalsEmptyStateProps = {
  onCreate?: () => void;
  onLearnMore?: () => void;
};

export function GoalsEmptyState({ onCreate, onLearnMore }: GoalsEmptyStateProps) {
  const { data: answers } = useOnboardingAnswers();
  const personalized = getPersonalizedEmptyStateCopy('objetivos', answers ?? null);

  const title = personalized.title || 'Ainda sem objetivos';
  const description =
    personalized.description ||
    'Cria metas de poupança com valor alvo, data prevista e acompanha o progresso em tempo real.';

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.iconRing}>
          <SymbolView
            name={{ ios: 'target', android: 'flag', web: 'flag' }}
            tintColor={colors.primary}
            size={36}
          />
        </View>
        <View style={styles.heroBadge}>
          <Text variant="caption" color="primary">
            0%
          </Text>
        </View>
      </View>

      <Text variant="h2" align="center">
        {title}
      </Text>
      <Text variant="body" color="textSecondary" align="center" style={styles.description}>
        {description}
      </Text>

      <Card variant="outlined" style={styles.examplesCard}>
        <Text variant="label" color="textMuted">
          Exemplos populares
        </Text>
        <View style={styles.chipRow}>
          {EXAMPLE_GOALS.map((example) => (
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
        {onCreate ? (
          <Button
            label="Criar primeiro objetivo"
            onPress={onCreate}
            fullWidth
            size="lg"
            icon={
              <SymbolView
                name={{ ios: 'plus.circle.fill', android: 'add_circle', web: 'add_circle' }}
                tintColor={colors.textInverse}
                size={20}
              />
            }
          />
        ) : null}
        {onLearnMore ? (
          <Button label="Como funcionam os objetivos?" variant="ghost" onPress={onLearnMore} fullWidth />
        ) : null}
      </View>
    </View>
  );
}

const HIGHLIGHTS = [
  'Barra de progresso por objetivo',
  'Valor actual vs. valor alvo',
  'Data prevista para manter o foco',
  'Integrado com o teu Perfil Financeiro',
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
    backgroundColor: colors.primaryMuted,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadge: {
    position: 'absolute',
    right: -8,
    bottom: -4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
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
