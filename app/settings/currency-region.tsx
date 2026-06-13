import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import {
  SettingsHero,
  SettingsOptionGroup,
  SettingsScreenLayout,
} from '@/components/settings';
import { Button, Card, LoadingSpinner } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useUpdateCurrency } from '@/hooks/mutations/useProfileMutations';
import { useUpdatePreferences, useUserPreferences } from '@/hooks/queries/useUserPreferences';
import { useProfile } from '@/hooks/queries/useProfile';
import { CURRENCY_OPTIONS, REGION_OPTIONS } from '@/lib/preferences/config';
import type { SupportedCurrency, UserRegion } from '@/lib/preferences/types';
import { spacing } from '@/lib/theme';

export default function CurrencyRegionScreen() {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: preferences, isLoading: prefsLoading } = useUserPreferences();
  const updateCurrency = useUpdateCurrency();
  const updatePreferences = useUpdatePreferences();
  const { showToast } = useToast();

  const [currency, setCurrency] = useState<SupportedCurrency>('EUR');
  const [region, setRegion] = useState<UserRegion>('portugal');

  useEffect(() => {
    if (profile?.currency) {
      setCurrency(profile.currency as SupportedCurrency);
    }
  }, [profile?.currency]);

  useEffect(() => {
    if (preferences?.region) {
      setRegion(preferences.region);
    }
  }, [preferences?.region]);

  async function handleSave() {
    try {
      await Promise.all([
        updateCurrency.mutateAsync(currency),
        updatePreferences.mutateAsync({ region }),
      ]);
      showToast('Moeda e região actualizadas.', 'success');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Não foi possível guardar as preferências.',
        'error',
      );
    }
  }

  if ((profileLoading && !profile) || (prefsLoading && !preferences)) {
    return (
      <SettingsScreenLayout title="Moeda e região" subtitle="Formatação de valores e contexto local">
        <LoadingSpinner message="A carregar..." />
      </SettingsScreenLayout>
    );
  }

  const saving = updateCurrency.isPending || updatePreferences.isPending;

  return (
    <SettingsScreenLayout
      title="Moeda e região"
      subtitle="Formatação de valores e contexto local">
      <SettingsHero
        icon={{ ios: 'eurosign.circle', android: 'euro', web: 'euro' }}
        title="Preferências regionais"
        description="Define como os valores monetários e datas são apresentados em toda a app."
      />

      <Card variant="elevated" style={styles.card}>
        <SettingsOptionGroup
          title="Moeda principal"
          options={CURRENCY_OPTIONS.map((item) => ({ id: item.code, label: item.label }))}
          value={currency}
          onChange={setCurrency}
          disabled={saving}
        />
        <SettingsOptionGroup
          title="Região"
          options={REGION_OPTIONS}
          value={region}
          onChange={setRegion}
          disabled={saving}
        />
      </Card>

      <Button label="Guardar preferências" onPress={handleSave} loading={saving} fullWidth />
    </SettingsScreenLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing['2xl'],
  },
});
