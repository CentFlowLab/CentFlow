import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Text } from '@/components/ui';
import { colors, radius, spacing } from '@/lib/theme';

export const QUICK_EXPENSE_URL = 'centflow://quick-expense';

const STEPS: string[] = [
  'Abre a app Atalhos no iPhone',
  'Cria um novo atalho → adiciona a ação "Abrir URL"',
  `Insere o URL: ${QUICK_EXPENSE_URL}`,
  'Dá o nome "Despesa CentFlow" e guarda',
  'Abre as Definições do iPhone',
  'Vai a Acessibilidade → Toque → Tocar Atrás',
  'Em Toque Duplo, escolhe "Despesa CentFlow"',
];

type BackTapGuideProps = {
  visible: boolean;
  onTestNow: () => void;
  onLater: () => void;
};

export function BackTapGuide({ visible, onTestNow, onLater }: BackTapGuideProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await Share.share({ message: QUICK_EXPENSE_URL });
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
            Adiciona despesas em 2 toques
          </Text>
          <Text variant="bodyMedium" color="textSecondary" style={styles.subtitle}>
            Configura o iPhone para abrir o registo rápido com dois toques nas costas.
          </Text>

          <View style={styles.steps}>
            {STEPS.map((step, index) => (
              <View key={step} style={styles.stepRow}>
                <View style={styles.stepNumber}>
                  <Text variant="caption" color="primary" style={styles.stepNumberText}>
                    {index + 1}
                  </Text>
                </View>
                <Text variant="bodyMedium" style={styles.stepText} selectable>
                  {step}
                </Text>
              </View>
            ))}
          </View>

          <Button
            label={copied ? 'Copiado ✓' : 'Copiar URL'}
            variant="secondary"
            onPress={handleCopy}
            fullWidth
            icon={
              <SymbolView
                name={
                  copied
                    ? { ios: 'checkmark', android: 'check', web: 'check' }
                    : { ios: 'doc.on.doc', android: 'content_copy', web: 'content_copy' }
                }
                tintColor={colors.primary}
                size={16}
              />
            }
          />

          <Card variant="outlined" style={styles.testCard}>
            <Text variant="h3">Testa agora</Text>
            <Text variant="caption" color="textSecondary" style={styles.testText}>
              Depois de configurar, dá dois toques nas costas do iPhone. Se aparecer o ecrã de
              registo rápido, está a funcionar.
            </Text>
          </Card>

          <Button label="Já configurei — testar agora" onPress={onTestNow} fullWidth size="lg" />

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
