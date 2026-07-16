import { Link } from 'expo-router';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { LegalLinksFooter } from '@/components/legal/LegalLinksFooter';
import { Button, Card, Text } from '@/components/ui';
import { SettingsToggleRow } from '@/components/settings';
import { appHref } from '@/lib/navigation/href';
import { colors, radius, spacing } from '@/lib/theme';

type PrivacyConsentModalProps = {
  visible: boolean;
  productAnalytics: boolean;
  crashReporting: boolean;
  onProductAnalyticsChange: (value: boolean) => void;
  onCrashReportingChange: (value: boolean) => void;
  onConfirm: () => void;
  saving?: boolean;
};

export function PrivacyConsentModal({
  visible,
  productAnalytics,
  crashReporting,
  onProductAnalyticsChange,
  onCrashReportingChange,
  onConfirm,
  saving = false,
}: PrivacyConsentModalProps) {
  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <View style={styles.backdrop}>
        <Card variant="elevated" style={styles.sheet} padding="lg">
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <Text variant="h2">Privacidade e telemetria</Text>
            <Text variant="body" color="textSecondary">
              Escolhe o que partilhas connosco. Podes alterar estas opções mais tarde em
              Definições → Privacidade.
            </Text>

            <Card variant="outlined" style={styles.block} padding="md">
              <Text variant="bodyMedium">Essencial (necessário ao serviço)</Text>
              <Text variant="caption" color="textMuted">
                · Autenticação e sessão segura{'\n'}
                · Sincronização dos teus dados financeiros{'\n'}
                · Diagnóstico local em builds beta (Doctor){'\n'}
                · Segurança e integridade da app
              </Text>
            </Card>

            <Card variant="elevated" style={styles.block} padding="sm">
              <SettingsToggleRow
                label="Analytics de produto (opcional)"
                description="Eventos anónimos para melhorar funcionalidades (ex.: definições abertas)"
                value={productAnalytics}
                onValueChange={onProductAnalyticsChange}
              />
              <SettingsToggleRow
                label="Relatórios de crash (opcional)"
                description="Envia erros técnicos para corrigirmos falhas mais rapidamente (Sentry)"
                value={crashReporting}
                onValueChange={onCrashReportingChange}
              />
            </Card>

            <Text variant="caption" color="textMuted">
              Ao continuar, aceitas os{' '}
              <Link href={appHref('legalTerms')} asChild>
                <Pressable>
                  <Text variant="caption" color="primary">
                    Termos de Utilização
                  </Text>
                </Pressable>
              </Link>{' '}
              e confirmas que leste a{' '}
              <Link href={appHref('legalPrivacy')} asChild>
                <Pressable>
                  <Text variant="caption" color="primary">
                    Política de Privacidade
                  </Text>
                </Pressable>
              </Link>
              .
            </Text>

            <Button
              label={saving ? 'A guardar...' : 'Continuar'}
              onPress={onConfirm}
              loading={saving}
              fullWidth
              size="lg"
            />

            <LegalLinksFooter />
          </ScrollView>
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  sheet: {
    maxHeight: '88%',
    borderRadius: radius.xl,
  },
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.sm,
  },
  block: {
    gap: spacing.sm,
  },
});
