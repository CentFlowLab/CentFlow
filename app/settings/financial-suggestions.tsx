import { StyleSheet, View } from 'react-native';

import {
  SettingsHero,
  SettingsScreenLayout,
  SettingsToggleRow,
} from '@/components/settings';
import { Card, LoadingSpinner, SectionHeader, Text } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useUpdatePreferences, useUserPreferences } from '@/hooks/queries/useUserPreferences';
import type { UserPreferences } from '@/lib/preferences/types';
import { spacing } from '@/lib/theme';

type RuleToggle = {
  key: keyof Pick<
    UserPreferences,
    | 'recommendationDebtVsInvestment'
    | 'recommendationSurplusAllocation'
    | 'recommendationCategoryMedian'
    | 'recommendationEmergencyFund'
    | 'recommendationHabitInsight'
  >;
  label: string;
  description: string;
};

const RULE_TOGGLES: RuleToggle[] = [
  {
    key: 'recommendationDebtVsInvestment',
    label: 'Dívida vs investimento',
    description: 'Sugere amortização quando a taxa de dívida é claramente superior ao rendimento investido',
  },
  {
    key: 'recommendationSurplusAllocation',
    label: 'Excedente de fim de mês',
    description: 'Propõe destino para margem disponível (dívida ou objetivos, conforme prioridade)',
  },
  {
    key: 'recommendationCategoryMedian',
    label: 'Categoria acima da mediana',
    description: 'Alerta quando uma categoria gasta consistentemente acima do habitual',
  },
  {
    key: 'recommendationEmergencyFund',
    label: 'Fundo de emergência',
    description: 'Prioriza poupança de emergência quando o disponível cobre poucas despesas fixas',
  },
  {
    key: 'recommendationHabitInsight',
    label: 'Padrões de gasto habituais',
    description: 'Contexto neutro quando um gasto semanal habitual difere do valor típico (sem alertas push)',
  },
];

export default function FinancialSuggestionsScreen() {
  const { data: preferences, isLoading } = useUserPreferences();
  const updatePreferences = useUpdatePreferences();
  const { showToast } = useToast();

  async function handleDebtPriorityToggle(value: boolean) {
    try {
      await updatePreferences.mutateAsync({ prioritizeDebtAmortization: value });
    } catch {
      showToast('Não foi possível guardar a preferência.', 'error');
    }
  }

  async function handleRuleToggle(key: RuleToggle['key'], value: boolean) {
    try {
      await updatePreferences.mutateAsync({ [key]: value });
    } catch {
      showToast('Não foi possível guardar a preferência.', 'error');
    }
  }

  if (isLoading || !preferences) {
    return (
      <SettingsScreenLayout title="Sugestões financeiras" subtitle="Como calculamos as acções">
        <LoadingSpinner message="A carregar preferências..." />
      </SettingsScreenLayout>
    );
  }

  return (
    <SettingsScreenLayout title="Sugestões financeiras" subtitle="Como calculamos as acções">
      <SettingsHero
        icon={{ ios: 'lightbulb.fill', android: 'lightbulb', web: 'lightbulb' }}
        title="Margem de poupança real"
        description="As sugestões na Home e Análises usam o disponível menos uma estimativa de gastos variáveis até ao fim do mês."
      />

      <View style={styles.section}>
        <SectionHeader title="Prioridade" />
        <Card variant="elevated" style={styles.card}>
          <SettingsToggleRow
            label="Priorizar amortização de dívida"
            description="Quando activo, sugerimos pagar dívida antes de alocar a objetivos de poupança"
            value={preferences.prioritizeDebtAmortization}
            onValueChange={(value) => void handleDebtPriorityToggle(value)}
            disabled={updatePreferences.isPending}
          />
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Regras de recomendação" />
        <Card variant="elevated" style={styles.card}>
          {RULE_TOGGLES.map((rule) => (
            <SettingsToggleRow
              key={rule.key}
              label={rule.label}
              description={rule.description}
              value={preferences[rule.key]}
              onValueChange={(value) => void handleRuleToggle(rule.key, value)}
              disabled={updatePreferences.isPending}
            />
          ))}
        </Card>
        <Text variant="caption" color="textMuted" style={styles.hint}>
          Cada regra é determinística e mostra os números reais que a originaram. Desactiva as que
          não quiseres ver na Home.
        </Text>
      </View>
    </SettingsScreenLayout>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing['2xl'],
  },
  card: {
    gap: spacing.xs,
  },
  hint: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
    lineHeight: 18,
  },
});
