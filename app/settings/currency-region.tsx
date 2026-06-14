import { useEffect, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';

import {
  SettingsHero,
  SettingsScreenLayout,
} from '@/components/settings';
import { Button, Card, LoadingSpinner, SearchableSelect } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useUpdateCurrency } from '@/hooks/mutations/useProfileMutations';
import { useUpdatePreferences, useUserPreferences } from '@/hooks/queries/useUserPreferences';
import { useProfile } from '@/hooks/queries/useProfile';
import {
  getCountryOptions,
  getCurrencyOptions,
  normalizeCountryCode,
} from '@/lib/preferences/locale.data';
import type { SupportedCurrency, UserRegion } from '@/lib/preferences/types';
import { spacing } from '@/lib/theme';

export default function CurrencyRegionScreen() {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: preferences, isLoading: prefsLoading } = useUserPreferences();
  const updateCurrency = useUpdateCurrency();
  const updatePreferences = useUpdatePreferences();
  const { showToast } = useToast();

  const currencyOptions = useMemo(() => getCurrencyOptions(), []);
  const countryOptions = useMemo(() => getCountryOptions(), []);

  const [currency, setCurrency] = useState<SupportedCurrency>('EUR');
  const [region, setRegion] = useState<UserRegion>('PT');

  useEffect(() => {
    if (profile?.currency) {
      setCurrency(profile.currency);
    }
  }, [profile?.currency]);

  useEffect(() => {
    if (preferences?.region) {
      setRegion(normalizeCountryCode(preferences.region));
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
  const hasChanges =
    currency !== (profile?.currency ?? 'EUR') ||
    region !== normalizeCountryCode(preferences?.region ?? 'PT');

  return (
    <SettingsScreenLayout
      title="Moeda e região"
      subtitle="Formatação de valores e contexto local">
      <SettingsHero
        icon={{ ios: 'eurosign.circle', android: 'euro', web: 'euro' }}
        title="Preferências regionais"
        description="Escolhe qualquer moeda e país. Usa a pesquisa para filtrar rapidamente a lista."
      />

      <Card variant="elevated" style={styles.card}>
        <SearchableSelect
          label="Moeda principal"
          placeholder="Selecciona uma moeda"
          value={currency}
          options={currencyOptions}
          onChange={setCurrency}
          disabled={saving}
        />
        <SearchableSelect
          label="País / região"
          placeholder="Selecciona um país"
          value={region}
          options={countryOptions}
          onChange={setRegion}
          disabled={saving}
        />
      </Card>

      <Button
        label="Guardar preferências"
        onPress={handleSave}
        loading={saving}
        disabled={!hasChanges || saving}
        fullWidth
      />
    </SettingsScreenLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing['2xl'],
  },
});
