import { StyleSheet, View } from 'react-native';

import {
  SettingsHero,
  SettingsScreenLayout,
  SettingsToggleRow,
} from '@/components/settings';
import { Card, LoadingSpinner, SectionHeader, Text } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useUpdatePreferences, useUserPreferences } from '@/hooks/queries/useUserPreferences';
import { spacing } from '@/lib/theme';

export default function FinancialSuggestionsScreen() {
  const { data: preferences, isLoading } = useUserPreferences();
  const updatePreferences = useUpdatePreferences();
  const { showToast } = useToast();

  async function handleToggle(value: boolean) {
    try {
      await updatePreferences.mutateAsync({ prioritizeDebtAmortization: value });
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
            onValueChange={(value) => void handleToggle(value)}
            disabled={updatePreferences.isPending}
          />
        </Card>
        <Text variant="caption" color="textMuted" style={styles.hint}>
          Reservamos ~10% da margem estimada como almofada de segurança. Desactiva esta opção se
          preferires sugestões de alocação a objetivos mesmo com dívida em aberto.
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
