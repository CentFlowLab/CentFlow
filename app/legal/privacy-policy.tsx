import { ScrollView, StyleSheet } from 'react-native';

import { SettingsScreenLayout } from '@/components/settings';
import { Text } from '@/components/ui';
import { LEGAL_LAST_UPDATED } from '@/lib/config/legal';
import { spacing } from '@/lib/theme';

export default function PrivacyPolicyScreen() {
  return (
    <SettingsScreenLayout title="Política de Privacidade" subtitle={`Última atualização: ${LEGAL_LAST_UPDATED}`}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Section title="1. Quem somos">
          A CentFlow («nós», «app») é uma aplicação de gestão financeira pessoal
          desenvolvida por EveryFT1me. Contacto: support@centflow.app.
        </Section>

        <Section title="2. Dados que recolhemos">
          Recolhemos apenas os dados necessários para o funcionamento da app: email e nome
          (conta), movimentos financeiros, objetivos, créditos, subscrições, garantias e
          recibos que introduzes ou digitalizas. Preferências de notificação e respostas de
          onboarding são guardadas na tua conta.
        </Section>

        <Section title="3. Como usamos os dados">
          Os teus dados servem exclusivamente para apresentar dashboards, análises,
          orçamentos e alertas dentro da app. Não vendemos dados a terceiros. Não usamos os
          teus dados financeiros para publicidade.
        </Section>

        <Section title="4. Armazenamento e segurança">
          Os dados são armazenados em servidores Supabase (UE) com encriptação em trânsito
          (TLS) e em repouso. Tokens de sessão ficam no cofre seguro do dispositivo
          (Secure Store). Podes activar Face ID / biometria para proteger o acesso à app.
        </Section>

        <Section title="5. OCR e recibos">
          Imagens de talões são enviadas para processamento OCR (Google Cloud Vision ou motor
          on-device). São associadas à tua conta e eliminadas quando eliminas a conta ou o
          movimento associado.
        </Section>

        <Section title="6. Emails">
          Enviamos emails transaccionais (confirmação de conta, recuperação de password) e,
          se activares, resumos semanais e alertas. Podes desactivar emails não essenciais
          em Definições → Notificações.
        </Section>

        <Section title="7. Os teus direitos">
          Podes exportar os teus dados (Definições → Exportar dados), corrigir informação no
          perfil e pedir eliminação permanente da conta (Definições → Privacidade).
        </Section>

        <Section title="8. Retenção">
          Os dados mantêm-se enquanto a tua conta estiver activa. Após eliminação da conta,
          removemos os dados associados no prazo de 30 dias, excepto cópias de segurança
          temporárias exigidas por lei.
        </Section>

        <Section title="9. Menores">
          A CentFlow não se destina a menores de 16 anos. Não recolhemos intencionalmente
          dados de menores.
        </Section>

        <Section title="10. Alterações">
          Podemos actualizar esta política. A data de «Última atualização» reflecte a versão
          vigente. Alterações significativas serão comunicadas na app.
        </Section>
      </ScrollView>
    </SettingsScreenLayout>
  );
}

function Section({ title, children }: { title: string; children: string }) {
  return (
    <>
      <Text variant="h3" style={styles.sectionTitle}>
        {title}
      </Text>
      <Text variant="body" color="textSecondary" style={styles.paragraph}>
        {children}
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing['3xl'],
    gap: spacing.md,
  },
  sectionTitle: {
    marginTop: spacing.md,
  },
  paragraph: {
    lineHeight: 22,
  },
});
