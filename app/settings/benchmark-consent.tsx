import { StyleSheet, View } from 'react-native';

import {
  SettingsHero,
  SettingsScreenLayout,
  SettingsToggleRow,
} from '@/components/settings';
import { Card, LoadingSpinner, Text } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useUpdatePreferences, useUserPreferences } from '@/hooks/queries/useUserPreferences';
import { MIN_BENCHMARK_SAMPLE_COUNT } from '@/lib/benchmarks/config';
import { INCOME_BUCKETS_EUR } from '@/lib/benchmarks/income-buckets';
import { spacing } from '@/lib/theme';

export default function BenchmarkConsentScreen() {
  const { data: preferences, isLoading } = useUserPreferences();
  const updatePreferences = useUpdatePreferences();
  const { showToast } = useToast();

  async function handleToggle(value: boolean) {
    try {
      await updatePreferences.mutateAsync({ benchmarkContributionConsent: value });
      showToast(
        value
          ? 'Obrigado — a tua contribuição é sempre anónima'
          : 'Contribuição desactivada',
        'success',
      );
    } catch {
      showToast('Não foi possível guardar a preferência.', 'error');
    }
  }

  if (isLoading || !preferences) {
    return (
      <SettingsScreenLayout
        title="Comparações anónimas"
        subtitle="Benchmarks agregados da comunidade">
        <LoadingSpinner message="A carregar..." />
      </SettingsScreenLayout>
    );
  }

  return (
    <SettingsScreenLayout
      title="Comparações anónimas"
      subtitle="Benchmarks agregados da comunidade">
      <SettingsHero
        icon={{ ios: 'person.3.fill', android: 'groups', web: 'groups' }}
        title="Dados agregados, nunca identificáveis"
        description="Opcional e desactivado por defeito. Só faz sentido com muitos utilizadores — a comparação na app permanece inactiva até haver amostras suficientes."
      />

      <Card variant="elevated" style={styles.card}>
        <SettingsToggleRow
          label="Contribuir com dados agregados"
          description="Permite usar os teus gastos para calcular médias anónimas por categoria"
          value={preferences.benchmarkContributionConsent}
          onValueChange={(value) => void handleToggle(value)}
        />
      </Card>

      <Card variant="outlined" style={styles.card}>
        <Text variant="h3">O que é partilhado</Text>
        <Text variant="body" color="textSecondary">
          Apenas totais mensais de gasto por categoria, agrupados em faixas largas de rendimento
          (ex.: 1 000 – 1 500 €). Nunca o teu rendimento exacto, nome, email ou movimentos
          individuais.
        </Text>
        <Text variant="body" color="textSecondary">
          Cada comparação pública só aparece quando existem pelo menos{' '}
          {MIN_BENCHMARK_SAMPLE_COUNT} utilizadores opt-in na mesma faixa e categoria — para evitar
          reidentificação.
        </Text>
      </Card>

      <Card variant="outlined" style={styles.card}>
        <Text variant="h3">Faixas de rendimento usadas</Text>
        {INCOME_BUCKETS_EUR.map((bucket) => (
          <Text key={bucket.key} variant="caption" color="textMuted">
            · {bucket.label}
          </Text>
        ))}
      </Card>

      <Card variant="outlined" style={styles.card}>
        <Text variant="h3">O que nunca acontece</Text>
        <Text variant="caption" color="textSecondary">
          · Não guardamos o teu ID na tabela de benchmarks{'\n'}· Não há opt-out disfarçado — só
          activas se quiseres{'\n'}· Não mostramos comparações sem amostra mínima{'\n'}· Podes
          revogar a qualquer momento
        </Text>
      </Card>

      <Text variant="caption" color="textMuted" style={styles.footer}>
        Esta funcionalidade está preparada mas inactiva na secção Análises até a comunidade ter
        escala suficiente. O cron semanal só publica agregados quando o limiar estatístico é
        atingido.
      </Text>
    </SettingsScreenLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  footer: {
    lineHeight: 20,
    paddingHorizontal: spacing.xs,
  },
});
