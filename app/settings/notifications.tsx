import { StyleSheet } from 'react-native';

import {
  SettingsHero,
  SettingsScreenLayout,
  SettingsToggleRow,
} from '@/components/settings';
import { Card, LoadingSpinner } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useUpdatePreferences, useUserPreferences } from '@/hooks/queries/useUserPreferences';
import { spacing } from '@/lib/theme';

export default function NotificationsScreen() {
  const { data: preferences, isLoading } = useUserPreferences();
  const updatePreferences = useUpdatePreferences();
  const { showToast } = useToast();

  async function handleToggle(
    key: 'pushNotifications' | 'warrantyAlerts' | 'budgetAlerts' | 'weeklyDigest',
    value: boolean,
  ) {
    try {
      await updatePreferences.mutateAsync({ [key]: value });
    } catch {
      showToast('Não foi possível guardar a preferência.', 'error');
    }
  }

  if (isLoading || !preferences) {
    return (
      <SettingsScreenLayout title="Notificações" subtitle="Alertas e resumos personalizados">
        <LoadingSpinner message="A carregar preferências..." />
      </SettingsScreenLayout>
    );
  }

  return (
    <SettingsScreenLayout
      title="Notificações"
      subtitle="Alertas e resumos personalizados">
      <SettingsHero
        icon={{ ios: 'bell.fill', android: 'notifications', web: 'notifications' }}
        title="Mantém-te informado"
        description="Escolhe que alertas queres receber sobre finanças e prazos."
      />

      <Card variant="elevated" style={styles.card}>
        <SettingsToggleRow
          label="Notificações push"
          description="Receber alertas no telemóvel"
          value={preferences.pushNotifications}
          onValueChange={(value) => handleToggle('pushNotifications', value)}
          disabled={updatePreferences.isPending}
        />
        <SettingsToggleRow
          label="Garantias a expirar"
          description="Aviso 30 dias antes do fim"
          value={preferences.warrantyAlerts}
          onValueChange={(value) => handleToggle('warrantyAlerts', value)}
          disabled={updatePreferences.isPending}
        />
        <SettingsToggleRow
          label="Orçamento mensal"
          description="Quando ultrapassares limites definidos"
          value={preferences.budgetAlerts}
          onValueChange={(value) => handleToggle('budgetAlerts', value)}
          disabled={updatePreferences.isPending}
        />
        <SettingsToggleRow
          label="Resumo semanal"
          description="Email com evolução do património"
          value={preferences.weeklyDigest}
          onValueChange={(value) => handleToggle('weeklyDigest', value)}
          disabled={updatePreferences.isPending}
        />
      </Card>
    </SettingsScreenLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
  },
});
