import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  SettingsHero,
  SettingsScreenLayout,
  SettingsToggleRow,
} from '@/components/settings';
import { Button, Card, LoadingSpinner, Text } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import {
  loadPrivacyConsent,
  savePrivacyConsent,
} from '@/lib/privacy/consent.storage';
import type { PrivacyConsentRecord } from '@/lib/privacy/consent.types';
import { appHref } from '@/lib/navigation/href';
import { bootstrapSentryFromConsent } from '@/lib/sentry/init';
import { spacing } from '@/lib/theme';

export default function PrivacyScreen() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [consent, setConsent] = useState<PrivacyConsentRecord | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const record = await loadPrivacyConsent();
    setConsent(record);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateConsent(
    patch: Partial<Pick<PrivacyConsentRecord, 'productAnalytics' | 'crashReporting'>>,
  ) {
    if (!consent) return;
    setSaving(true);
    try {
      const next = await savePrivacyConsent({
        productAnalytics: patch.productAnalytics ?? consent.productAnalytics,
        crashReporting: patch.crashReporting ?? consent.crashReporting,
      });
      setConsent(next);
      bootstrapSentryFromConsent();
      showToast('Preferências de privacidade actualizadas.', 'success');
    } catch {
      showToast('Não foi possível guardar as preferências.', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SettingsScreenLayout title="Privacidade" subtitle="Os teus dados e consentimentos">
        <LoadingSpinner message="A carregar..." />
      </SettingsScreenLayout>
    );
  }

  return (
    <SettingsScreenLayout title="Privacidade" subtitle="Os teus dados e consentimentos">
      <SettingsHero
        icon={{ ios: 'hand.raised.fill', android: 'privacy_tip', web: 'privacy_tip' }}
        title="Controlo dos teus dados"
        description="Transparência, exportação, consentimentos e documentos legais."
      />

      <View style={styles.section}>
        <Card variant="elevated" style={styles.card}>
          <Text variant="bodyMedium">Documentos legais</Text>
          <Button
            label="Política de Privacidade"
            variant="secondary"
            onPress={() => router.push(appHref('legalPrivacy'))}
          />
          <Button
            label="Termos de Utilização"
            variant="secondary"
            onPress={() => router.push(appHref('legalTerms'))}
          />
        </Card>
      </View>

      <View style={styles.section}>
        <Card variant="elevated" style={styles.card}>
          <Text variant="bodyMedium">Telemetria opcional</Text>
          <Text variant="caption" color="textMuted">
            Podes alterar estas opções a qualquer momento. O serviço essencial (sessão, sync,
            segurança) não depende delas.
          </Text>
          <SettingsToggleRow
            label="Analytics de produto"
            description="Eventos anónimos para melhorar a app"
            value={consent?.productAnalytics ?? false}
            onValueChange={(value) => void updateConsent({ productAnalytics: value })}
            disabled={saving || !consent}
          />
          <SettingsToggleRow
            label="Relatórios de crash"
            description="Ajuda a corrigir falhas (Sentry)"
            value={consent?.crashReporting ?? false}
            onValueChange={(value) => void updateConsent({ crashReporting: value })}
            disabled={saving || !consent}
          />
        </Card>
      </View>

      <View style={styles.section}>
        <Card variant="elevated" style={styles.card}>
          <Text variant="bodyMedium">Exportar dados</Text>
          <Text variant="caption" color="textMuted">
            Descarrega uma cópia dos teus dados financeiros registados na CentFlow (JSON).
          </Text>
          <Button
            label="Exportar dados"
            variant="secondary"
            onPress={() => router.push(appHref('exportData'))}
          />
          <Button
            label="Exportar PDF"
            variant="secondary"
            onPress={() => router.push(appHref('exportPdf'))}
          />
        </Card>
      </View>

      <View style={styles.section}>
        <Card variant="elevated" style={styles.card}>
          <Text variant="bodyMedium">Comparações anónimas (benchmarks)</Text>
          <Text variant="caption" color="textMuted">
            Opt-in separado — dados agregados, nunca identificáveis.
          </Text>
          <Button
            label="Gerir consentimento"
            variant="secondary"
            onPress={() => router.push('/settings/benchmark-consent')}
          />
        </Card>
      </View>

      <View style={styles.section}>
        <Card variant="outlined" style={styles.card}>
          <Text variant="bodyMedium">Open Banking</Text>
          <Text variant="caption" color="textMuted">
            Ligações bancárias com consentimento explícito revogável. Nenhum token bancário é
            guardado localmente.
          </Text>
          <Button
            label="Gerir ligações bancárias"
            variant="secondary"
            onPress={() => router.push('/settings/bank-connections')}
          />
        </Card>
      </View>

      <View style={styles.section}>
        <Card variant="outlined" style={styles.card}>
          <Text variant="bodyMedium">Eliminar conta</Text>
          <Text variant="caption" color="textMuted">
            Remove permanentemente a tua conta e dados associados no servidor.
          </Text>
          <Button
            label="Eliminar conta"
            variant="danger"
            onPress={() => router.push(appHref('deleteAccount'))}
          />
        </Card>
      </View>
    </SettingsScreenLayout>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing['2xl'],
  },
  card: {
    gap: spacing.md,
  },
});
