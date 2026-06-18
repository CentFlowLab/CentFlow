import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/layout';
import { Button, ScreenContainer, Text } from '@/components/ui';
import { useDiagnosticScreen } from '@/hooks/useDiagnosticScreen';
import { useToast } from '@/components/ui/Toast';
import {
  clearAppLog,
  exportAppLogText,
  isDiagnosticsEnabled,
  subscribeAppLog,
  type AppLogEntry,
} from '@/lib/diagnostics';
import {
  EMAIL_TYPE_LABELS,
  invokeTestEmail,
  isEmailDevToolsEnabled,
  type LifecycleEmailType,
} from '@/lib/email';
import { colors, radius, spacing } from '@/lib/theme';

export default function DiagnosticsSettingsScreen() {
  useDiagnosticScreen('doctor');

  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const [entries, setEntries] = useState<AppLogEntry[]>([]);
  const [emailLoading, setEmailLoading] = useState<LifecycleEmailType | null>(null);

  const emailTestTypes = Object.keys(EMAIL_TYPE_LABELS) as LifecycleEmailType[];

  async function handleTestEmail(type: LifecycleEmailType) {
    setEmailLoading(type);
    try {
      await invokeTestEmail(type);
      showToast(`Email «${EMAIL_TYPE_LABELS[type]}» registado (preview/envio).`, 'success');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Falha ao testar email.',
        'error',
      );
    } finally {
      setEmailLoading(null);
    }
  }

  useEffect(() => {
    if (!isDiagnosticsEnabled()) {
      router.back();
      return;
    }
    return subscribeAppLog(setEntries);
  }, []);

  async function handleShare() {
    try {
      await Share.share({
        message: exportAppLogText(),
        title: 'CentFlow Doctor — Log',
      });
    } catch {
      showToast('Não foi possível partilhar o log.', 'error');
    }
  }

  if (!isDiagnosticsEnabled()) return null;

  return (
    <View style={styles.screen}>
      <AppHeader title="CentFlow Doctor" subtitle="Erros, mutations e contexto técnico" showBack />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, spacing['2xl']) },
        ]}>
        <ScreenContainer scrollable={false}>
          <Text variant="body" color="textSecondary" style={styles.lead}>
            Todos os erros, avisos e falhas de rede ficam registados aqui durante os testes.
            Usa «Partilhar log» para enviar ao developer.
          </Text>

          <View style={styles.actions}>
            <Button label="Partilhar log" onPress={() => void handleShare()} fullWidth />
            <Button
              label="Limpar log"
              variant="ghost"
              onPress={() => {
                clearAppLog();
                showToast('Log limpo.', 'info');
              }}
              fullWidth
            />
          </View>

          {isEmailDevToolsEnabled() ? (
            <View style={styles.emailSection}>
              <Text variant="label" color="textMuted">
                Testar emails lifecycle
              </Text>
              {emailTestTypes.map((type) => (
                <Button
                  key={type}
                  label={EMAIL_TYPE_LABELS[type]}
                  variant="secondary"
                  loading={emailLoading === type}
                  disabled={emailLoading !== null}
                  onPress={() => void handleTestEmail(type)}
                  fullWidth
                />
              ))}
            </View>
          ) : null}

          <View style={styles.list}>
            {entries.map((entry) => (
              <View key={entry.id} style={styles.entry}>
                <Text variant="caption" color={entry.level === 'error' ? 'danger' : 'textMuted'}>
                  {entry.severity.toUpperCase()} · {entry.level.toUpperCase()} · {entry.source}
                </Text>
                <Text variant="bodyMedium">{entry.message}</Text>
                {entry.context?.screen ? (
                  <Text variant="caption" color="textSecondary">
                    screen: {String(entry.context.screen)}
                    {entry.context.action ? ` · action: ${String(entry.context.action)}` : ''}
                  </Text>
                ) : null}
                {entry.stack ? (
                  <Text variant="caption" color="textMuted" style={styles.mono}>
                    {entry.stack}
                  </Text>
                ) : null}
                <Text variant="caption" color="textMuted">
                  {new Date(entry.timestamp).toLocaleString('pt-PT')}
                </Text>
              </View>
            ))}
          </View>
        </ScreenContainer>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingTop: spacing.md,
  },
  lead: {
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  actions: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  emailSection: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  list: {
    gap: spacing.md,
  },
  entry: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  mono: {
    fontFamily: 'monospace',
    lineHeight: 16,
  },
});
