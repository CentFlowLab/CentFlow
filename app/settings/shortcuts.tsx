import { SymbolView } from 'expo-symbols';
import { Platform, Share, StyleSheet, View } from 'react-native';

import { SettingsHero, SettingsScreenLayout } from '@/components/settings';
import { Button, Card, Text } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { colors, radius, spacing } from '@/lib/theme';

const QUICK_EXPENSE_URL = 'centflow://quick-expense';

const IOS_STEPS = [
  'Abre a app Atalhos no iPhone.',
  'Cria um novo atalho.',
  'Adiciona a ação "Abrir URL".',
  `Insere o URL: ${QUICK_EXPENSE_URL}`,
  'Dá o nome "Adicionar despesa CentFlow".',
  'Guarda o atalho.',
  'Abre as Definições do iPhone.',
  'Vai a Acessibilidade → Toque → Tocar Atrás.',
  'Em Toque Duplo, escolhe o atalho "Adicionar despesa CentFlow".',
];

const ANDROID_STEPS = [
  'Mantém premido o ícone da CentFlow no ecrã inicial.',
  'Escolhe "Widgets" ou "Atalhos" (conforme o launcher).',
  'Adiciona o widget/atalho "Gasto rápido" se disponível.',
  'Alternativa: usa o URL da app abaixo num atalho da app Atalhos (Samsung/Google).',
  `URL: ${QUICK_EXPENSE_URL}`,
  'No Android 13+, podes criar um atalho na app Atalhos do sistema.',
];

export default function ShortcutsScreen() {
  const { showToast } = useToast();
  const isIos = Platform.OS === 'ios';
  const steps = isIos ? IOS_STEPS : ANDROID_STEPS;

  async function handleCopyUrl() {
    try {
      await Share.share({ message: QUICK_EXPENSE_URL });
    } catch {
      showToast('Não foi possível abrir o menu de partilha.', 'error');
    }
  }

  return (
    <SettingsScreenLayout
      title="Atalhos rápidos"
      subtitle={
        isIos
          ? 'Adicionar despesas com dois toques atrás do iPhone'
          : 'Abrir o gasto rápido a partir do ecrã inicial ou atalhos do sistema'
      }>
      <SettingsHero
        icon={
          isIos
            ? { ios: 'hand.tap.fill', android: 'touch_app', web: 'touch_app' }
            : { ios: 'square.grid.2x2.fill', android: 'widgets', web: 'widgets' }
        }
        title={isIos ? 'Toque Atrás do iPhone' : 'Atalhos no Android'}
        description={
          isIos
            ? 'O iOS não permite à app detetar o gesto diretamente. A solução é criar um atalho que abre a CentFlow no Gasto rápido.'
            : 'No Android, usa widgets ou a app Atalhos do sistema com o URL da CentFlow. Os passos variam consoante o fabricante.'
        }
      />

      <Card variant="outlined" style={styles.urlCard}>
        <Text variant="label" color="textMuted">
          URL do atalho
        </Text>
        <Text variant="bodyMedium" color="primary" selectable style={styles.url}>
          {QUICK_EXPENSE_URL}
        </Text>
        <Text variant="caption" color="textMuted">
          Mantém premido para copiar, ou usa o botão abaixo.
        </Text>
        <Button
          label="Partilhar URL"
          onPress={() => void handleCopyUrl()}
          variant="secondary"
          fullWidth
          style={styles.copyButton}
          icon={
            <SymbolView
              name={{ ios: 'square.and.arrow.up', android: 'share', web: 'share' }}
              tintColor={colors.primary}
              size={16}
            />
          }
        />
      </Card>

      <View style={styles.stepsBlock}>
        <Text variant="label" color="textMuted">
          Passo a passo ({isIos ? 'iOS' : 'Android'})
        </Text>
        <Card variant="outlined" style={styles.stepsCard}>
          {steps.map((step, index) => (
            <View
              key={step}
              style={[styles.stepRow, index < steps.length - 1 && styles.stepRowBorder]}>
              <View style={styles.stepNumber}>
                <Text variant="caption" color="primary">
                  {index + 1}
                </Text>
              </View>
              <Text variant="bodyMedium" style={styles.stepText}>
                {step}
              </Text>
            </View>
          ))}
        </Card>
      </View>

      <Text variant="caption" color="textMuted" style={styles.footnote}>
        {isIos
          ? 'Depois de configurado, dois toques nas costas do iPhone abrem o Gasto rápido da CentFlow.'
          : 'No Android, o widget ou atalho abre directamente o ecrã de Gasto rápido.'}
      </Text>
    </SettingsScreenLayout>
  );
}

const styles = StyleSheet.create({
  urlCard: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  url: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  copyButton: {
    marginTop: spacing.sm,
  },
  stepsBlock: {
    gap: spacing.sm,
  },
  stepsCard: {
    paddingVertical: spacing.xs,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  stepRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: radius.full,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    flex: 1,
  },
  footnote: {
    marginTop: spacing.lg,
  },
});
