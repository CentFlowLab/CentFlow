import { SymbolView } from 'expo-symbols';
import { Modal, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Text } from '@/components/ui';
import { colors, radius, spacing } from '@/lib/theme';

export const QUICK_EXPENSE_URL = 'centflow://quick-expense';
export const QUICK_EXPENSE_URL_TEMPLATE =
  'centflow://quick-expense?amount=[valor]&category=[categoria]&note=[nota]';

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

const STEPS: { text: string; hint?: string }[] = [
  { text: 'Abre a app Atalhos no iPhone' },
  { text: 'Cria um novo atalho' },
  {
    text: 'Adiciona a ação "Pedir entrada" → tipo Número → pergunta "Valor da despesa?"',
    hint: 'Guarda o resultado como variável valor',
  },
  {
    text: 'Adiciona a ação "Escolher entre lista" com: Alimentação, Transportes, Habitação, Saúde, Compras, Lazer, Outros',
    hint: 'Guarda o resultado como variável categoria',
  },
  {
    text: 'Adiciona a ação "Pedir entrada" → tipo Texto → pergunta "Nota (opcional)"',
    hint: 'Guarda o resultado como variável nota',
  },
  {
    text: `Adiciona a ação "Abrir URL" com:\n${QUICK_EXPENSE_URL_TEMPLATE}`,
    hint: 'Substitui [valor], [categoria] e [nota] pelas variáveis criadas acima.',
  },
  { text: 'Dá o nome "Despesa CentFlow" e guarda' },
  { text: 'Abre Definições → Acessibilidade → Toque → Tocar Atrás → Toque Duplo' },
  { text: 'Escolhe "Despesa CentFlow"' },
];

const CATEGORY_MAP: { pt: string; key: string }[] = [
  { pt: 'Alimentação', key: 'food' },
  { pt: 'Transportes', key: 'transport' },
  { pt: 'Habitação', key: 'home' },
  { pt: 'Saúde', key: 'health' },
  { pt: 'Compras', key: 'shopping' },
  { pt: 'Lazer', key: 'leisure' },
  { pt: 'Outros', key: 'other' },
];

type BackTapGuideProps = {
  visible: boolean;
  onTestNow: () => void;
  onLater: () => void;
  testStatus?: TestStatus;
};

export function BackTapGuide({ visible, onTestNow, onLater, testStatus = 'idle' }: BackTapGuideProps) {
  async function handleCopy() {
    try {
      await Share.share({ message: QUICK_EXPENSE_URL_TEMPLATE });
    } catch {
      // ignorado — o utilizador pode copiar o URL manualmente (texto selecionável)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onLater}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          <View style={styles.iconBadge}>
            <SymbolView
              name={{ ios: 'hand.tap.fill', android: 'touch_app', web: 'touch_app' }}
              tintColor={colors.primary}
              size={32}
            />
          </View>

          <Text variant="h1" style={styles.title}>
            Regista despesas em 2 toques
          </Text>
          <Text variant="bodyMedium" color="textSecondary" style={styles.subtitle}>
            O iPhone pergunta o valor e a categoria — a CentFlow guarda automaticamente.
          </Text>

          <View style={styles.steps}>
            {STEPS.map((step, index) => (
              <View key={step.text} style={styles.stepRow}>
                <View style={styles.stepNumber}>
                  <Text variant="caption" color="primary" style={styles.stepNumberText}>
                    {index + 1}
                  </Text>
                </View>
                <View style={styles.stepText}>
                  <Text variant="bodyMedium" selectable>
                    {step.text}
                  </Text>
                  {step.hint ? (
                    <Text variant="caption" color="textMuted" style={styles.stepHint}>
                      {step.hint}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>

          <Button
            label="Copiar modelo do URL"
            variant="secondary"
            onPress={handleCopy}
            fullWidth
            icon={
              <SymbolView
                name={{ ios: 'doc.on.doc', android: 'content_copy', web: 'content_copy' }}
                tintColor={colors.primary}
                size={16}
              />
            }
          />

          <Card variant="outlined" style={styles.mapCard}>
            <Text variant="bodyMedium" style={styles.mapTitle}>
              Categorias na lista do atalho
            </Text>
            <Text variant="caption" color="textSecondary">
              No passo 6, substitui [categoria] pelo parâmetro correspondente, ou usa o nome em
              português — a app reconhece ambos.
            </Text>
            <View style={styles.mapRows}>
              {CATEGORY_MAP.map((row) => (
                <View key={row.key} style={styles.mapRow}>
                  <Text variant="caption" color="textSecondary">
                    {row.pt}
                  </Text>
                  <Text variant="caption" color="primary" style={styles.mapKey}>
                    {row.key}
                  </Text>
                </View>
              ))}
            </View>
          </Card>

          <Card variant="outlined" style={styles.testCard}>
            <Text variant="h3">Testa agora</Text>
            <Text variant="caption" color="textSecondary" style={styles.testText}>
              Depois de configurar, dá dois toques nas costas do iPhone. Ou testa aqui — guardamos
              uma despesa de 1 € para confirmar.
            </Text>
            {testStatus === 'success' ? (
              <Text variant="bodyMedium" color="success">
                Está a funcionar!
              </Text>
            ) : null}
            {testStatus === 'error' ? (
              <Text variant="bodyMedium" color="danger">
                Algo correu mal. Verifica a configuração.
              </Text>
            ) : null}
          </Card>

          <Button
            label="Já configurei — testar agora"
            onPress={onTestNow}
            fullWidth
            size="lg"
            loading={testStatus === 'testing'}
            disabled={testStatus === 'testing'}
          />

          <Pressable
            onPress={onLater}
            style={styles.laterLink}
            accessibilityRole="button"
            accessibilityLabel="Configurar mais tarde">
            <Text variant="bodyMedium" color="textMuted">
              Configurar mais tarde
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  title: {
    marginTop: spacing.sm,
  },
  subtitle: {
    marginBottom: spacing.sm,
  },
  steps: {
    gap: spacing.md,
    marginVertical: spacing.sm,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepNumberText: {
    fontWeight: '700',
  },
  stepText: {
    flex: 1,
    gap: 2,
  },
  stepHint: {
    fontStyle: 'italic',
  },
  mapCard: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  mapTitle: {
    fontWeight: '600',
  },
  mapRows: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  mapRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mapKey: {
    fontFamily: 'Courier',
  },
  testCard: {
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  testText: {
    lineHeight: 20,
  },
  laterLink: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
});
