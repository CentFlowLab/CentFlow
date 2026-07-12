import { StyleSheet, View } from 'react-native';

import {
  SettingsHero,
  SettingsScreenLayout,
  SettingsThresholdSlider,
  SettingsToggleRow,
} from '@/components/settings';
import { Card, LoadingSpinner, SectionHeader, Text } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import {
  MAX_CATEGORY_SPEND_ALERT_THRESHOLD,
  MIN_CATEGORY_SPEND_ALERT_THRESHOLD,
} from '@/lib/domain/financial/category-spend-anomaly';
import { useUpdatePreferences, useUserPreferences } from '@/hooks/queries/useUserPreferences';
import { spacing } from '@/lib/theme';

type PushToggleKey =
  | 'pushNotifications'
  | 'warrantyAlerts'
  | 'budgetAlerts'
  | 'categorySpendAlerts'
  | 'weeklyDigest';

type EmailToggleKey =
  | 'emailImportant'
  | 'emailWeeklyDigest'
  | 'emailWarrantyAlerts'
  | 'emailSubscriptionRenewals'
  | 'emailCreditPayments'
  | 'emailTipsInsights';

export default function NotificationsScreen() {
  const { data: preferences, isLoading } = useUserPreferences();
  const updatePreferences = useUpdatePreferences();
  const { showToast } = useToast();

  async function handlePushToggle(key: PushToggleKey, value: boolean) {
    try {
      await updatePreferences.mutateAsync({ [key]: value });
    } catch {
      showToast('Não foi possível guardar a preferência.', 'error');
    }
  }

  async function handleEmailToggle(key: EmailToggleKey, value: boolean) {
    try {
      await updatePreferences.mutateAsync({ [key]: value });
    } catch {
      showToast('Não foi possível guardar a preferência.', 'error');
    }
  }

  if (isLoading || !preferences) {
    return (
      <SettingsScreenLayout title="Notificações" subtitle="Alertas, emails e resumos">
        <LoadingSpinner message="A carregar preferências..." />
      </SettingsScreenLayout>
    );
  }

  return (
    <SettingsScreenLayout title="Notificações" subtitle="Alertas, emails e resumos">
      <SettingsHero
        icon={{ ios: 'bell.fill', android: 'notifications', web: 'notifications' }}
        title="Mantém-te informado"
        description="Escolhe como queres receber alertas úteis — sem spam."
      />

      <View style={styles.section}>
        <SectionHeader title="Push" />
        <Card variant="elevated" style={styles.card}>
          <SettingsToggleRow
            label="Notificações push"
            description="Alertas no telemóvel sobre prazos e resumos"
            value={preferences.pushNotifications}
            onValueChange={(value) => handlePushToggle('pushNotifications', value)}
            disabled={updatePreferences.isPending}
          />
          <SettingsToggleRow
            label="Garantias a expirar"
            description="Aviso 30 dias antes do fim"
            value={preferences.warrantyAlerts}
            onValueChange={(value) => handlePushToggle('warrantyAlerts', value)}
            disabled={updatePreferences.isPending}
          />
          <SettingsToggleRow
            label="Orçamento mensal"
            description="Quando ultrapassares limites definidos"
            value={preferences.budgetAlerts}
            onValueChange={(value) => handlePushToggle('budgetAlerts', value)}
            disabled={updatePreferences.isPending}
          />
          <SettingsToggleRow
            label="Gasto acima do habitual"
            description="Quando um gasto ultrapassa a mediana da categoria"
            value={preferences.categorySpendAlerts}
            onValueChange={(value) => handlePushToggle('categorySpendAlerts', value)}
            disabled={updatePreferences.isPending || !preferences.pushNotifications}
          />
          <SettingsThresholdSlider
            label="Limiar de alerta"
            description="Multiplicador sobre a mediana histórica (1,5× a 3×)"
            value={preferences.categorySpendAlertThreshold}
            minimumValue={MIN_CATEGORY_SPEND_ALERT_THRESHOLD}
            maximumValue={MAX_CATEGORY_SPEND_ALERT_THRESHOLD}
            step={0.5}
            formatValue={(value) => `${value.toFixed(1).replace('.', ',')}× a mediana`}
            onValueChange={async (value) => {
              try {
                await updatePreferences.mutateAsync({ categorySpendAlertThreshold: value });
              } catch {
                showToast('Não foi possível guardar o limiar.', 'error');
              }
            }}
            disabled={
              updatePreferences.isPending ||
              !preferences.pushNotifications ||
              !preferences.categorySpendAlerts
            }
          />
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Emails" />
        <Card variant="elevated" style={styles.card}>
          <SettingsToggleRow
            label="Emails importantes"
            description="Onboarding, inactividade e primeiro passo"
            value={preferences.emailImportant}
            onValueChange={(value) => handleEmailToggle('emailImportant', value)}
            disabled={updatePreferences.isPending}
          />
          <SettingsToggleRow
            label="Resumo semanal"
            description="Resumo financeiro por email"
            value={preferences.emailWeeklyDigest}
            onValueChange={(value) => handleEmailToggle('emailWeeklyDigest', value)}
            disabled={updatePreferences.isPending}
          />
          <SettingsToggleRow
            label="Garantias a expirar"
            description="Lembrete por email"
            value={preferences.emailWarrantyAlerts}
            onValueChange={(value) => handleEmailToggle('emailWarrantyAlerts', value)}
            disabled={updatePreferences.isPending}
          />
          <SettingsToggleRow
            label="Despesas recorrentes a renovar"
            description="Aviso antes da renovação"
            value={preferences.emailSubscriptionRenewals}
            onValueChange={(value) => handleEmailToggle('emailSubscriptionRenewals', value)}
            disabled={updatePreferences.isPending}
          />
          <SettingsToggleRow
            label="Créditos e prestações"
            description="Prestações próximas por email"
            value={preferences.emailCreditPayments}
            onValueChange={(value) => handleEmailToggle('emailCreditPayments', value)}
            disabled={updatePreferences.isPending}
          />
          <SettingsToggleRow
            label="Dicas e insights"
            description="Sugestões financeiras úteis"
            value={preferences.emailTipsInsights}
            onValueChange={(value) => handleEmailToggle('emailTipsInsights', value)}
            disabled={updatePreferences.isPending}
          />
        </Card>
        <Text variant="caption" color="textMuted" style={styles.hint}>
          Emails de segurança (reset de password, alteração de conta) são sempre enviados quando
          necessário.
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
