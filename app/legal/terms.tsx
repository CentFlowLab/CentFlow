import { ScrollView, StyleSheet } from 'react-native';

import { SettingsScreenLayout } from '@/components/settings';
import { Text } from '@/components/ui';
import { FINANCIAL_DISCLAIMER, LEGAL_LAST_UPDATED } from '@/lib/config/legal';
import { spacing } from '@/lib/theme';

export default function TermsScreen() {
  return (
    <SettingsScreenLayout title="Termos de Utilização" subtitle={`Última atualização: ${LEGAL_LAST_UPDATED}`}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Section title="1. Aceitação">
          Ao criar conta ou usar a CentFlow, aceitas estes Termos de Utilização e a nossa
          Política de Privacidade.
        </Section>

        <Section title="2. Descrição do serviço">
          A CentFlow é uma ferramenta de organização financeira pessoal. Permite registar
          movimentos, objectivos, créditos, subscrições e garantias, e visualizar análises
          baseadas nos dados que introduzes.
        </Section>

        <Section title="3. Aviso financeiro">
          {FINANCIAL_DISCLAIMER}
        </Section>

        <Section title="4. Conta e segurança">
          És responsável por manter a confidencialidade das tuas credenciais. Notifica-nos
          imediatamente em caso de uso não autorizado: support@centflow.app.
        </Section>

        <Section title="5. Dados introduzidos por ti">
          Garantes que os dados que introduzes são teus ou que tens autorização para os
          usar. A precisão dos cálculos e análises depende da qualidade dos dados
          introduzidos.
        </Section>

        <Section title="6. Uso aceitável">
          Não podes usar a app para actividades ilegais, tentar aceder a dados de outros
          utilizadores, ou interferir com o funcionamento do serviço.
        </Section>

        <Section title="7. Disponibilidade">
          Esforçamo-nos por manter a app disponível, mas não garantimos disponibilidade
          ininterrupta. Funcionalidades podem ser adicionadas, alteradas ou removidas.
        </Section>

        <Section title="8. Propriedade intelectual">
          A marca CentFlow, design e código são propriedade de EveryFT1me. Não podes copiar,
          modificar ou distribuir a app sem autorização.
        </Section>

        <Section title="9. Limitação de responsabilidade">
          A CentFlow é fornecida «tal como está». Não somos responsáveis por decisões
          financeiras tomadas com base na app, nem por perdas resultantes de dados incorrectos
          introduzidos pelo utilizador.
        </Section>

        <Section title="10. Rescisão">
          Podes eliminar a tua conta a qualquer momento em Definições → Privacidade. Podemos
          suspender contas que violem estes termos.
        </Section>

        <Section title="11. Lei aplicável">
          Estes termos regem-se pela lei portuguesa. Para questões: support@centflow.app.
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
