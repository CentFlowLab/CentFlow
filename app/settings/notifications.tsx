import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { SettingsHero, SettingsScreenLayout } from '@/components/settings/SettingsScreenLayout';
import { Card, Text } from '@/components/ui';
import { colors, spacing } from '@/lib/theme';

type ToggleRowProps = {
  label: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
};

function ToggleRow({ label, description, value, onValueChange }: ToggleRowProps) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleText}>
        <Text variant="bodyMedium">{label}</Text>
        <Text variant="caption" color="textMuted">
          {description}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.surfaceHighlight, true: colors.primaryMuted }}
        thumbColor={value ? colors.primary : colors.textMuted}
      />
    </View>
  );
}

export default function NotificationsScreen() {
  const [pushEnabled, setPushEnabled] = useState(true);
  const [warrantyAlerts, setWarrantyAlerts] = useState(true);
  const [budgetAlerts, setBudgetAlerts] = useState(false);
  const [weeklyDigest, setWeeklyDigest] = useState(true);

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
        <ToggleRow
          label="Notificações push"
          description="Receber alertas no telemóvel"
          value={pushEnabled}
          onValueChange={setPushEnabled}
        />
        <ToggleRow
          label="Garantias a expirar"
          description="Aviso 30 dias antes do fim"
          value={warrantyAlerts}
          onValueChange={setWarrantyAlerts}
        />
        <ToggleRow
          label="Orçamento mensal"
          description="Quando ultrapassares limites definidos"
          value={budgetAlerts}
          onValueChange={setBudgetAlerts}
        />
        <ToggleRow
          label="Resumo semanal"
          description="Email com evolução do património"
          value={weeklyDigest}
          onValueChange={setWeeklyDigest}
        />
      </Card>
    </SettingsScreenLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  toggleText: {
    flex: 1,
    gap: spacing.xs,
  },
});
