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
  getMovementFlowDebugState,
  MOVEMENT_FLOW_SOURCE,
  FINANCIAL_MUTATION_SOURCE,
  OCR_FLOW_SOURCE,
} from '@/lib/doctor';
import {
  EMAIL_STATUS_LABELS,
  EMAIL_TYPE_LABELS,
  describeEmailProviderStatus,
  fetchEmailProviderStatus,
  invokeTestEmail,
  isEmailDevToolsEnabled,
  type EmailProviderStatus,
  type LifecycleEmailType,
} from '@/lib/email';
import { useEmailEvents } from '@/hooks/queries/useEmailEvents';
import { colors, radius, spacing } from '@/lib/theme';

const FINANCIAL_SOURCES = new Set([
  MOVEMENT_FLOW_SOURCE,
  FINANCIAL_MUTATION_SOURCE,
  OCR_FLOW_SOURCE,
  'doctor:mutation',
  'doctor:validation',
]);

export default function DiagnosticsSettingsScreen() {
  useDiagnosticScreen('doctor');

  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const [entries, setEntries] = useState<AppLogEntry[]>([]);
  const [financialOnly, setFinancialOnly] = useState(true);
  const [emailLoading, setEmailLoading] = useState<LifecycleEmailType | null>(null);
  const [emailPreviewMode, setEmailPreviewMode] = useState(true);
  const [emailProviderStatus, setEmailProviderStatus] = useState<EmailProviderStatus | null>(null);
  const { data: emailEvents, refetch: refetchEmailEvents } = useEmailEvents();

  const visibleEntries = financialOnly
    ? entries.filter((e) => FINANCIAL_SOURCES.has(e.source))
    : entries;

  const flowState = getMovementFlowDebugState();

  const emailTestTypes = Object.keys(EMAIL_TYPE_LABELS) as LifecycleEmailType[];

  async function handleTestEmail(type: LifecycleEmailType) {
    setEmailLoading(type);
    try {
      const result = await invokeTestEmail(type, { preview: emailPreviewMode });
      await refetchEmailEvents();
      const mode = result.preview ? 'preview' : 'envio real';
      if (result.skipped) {
        showToast(`Email «${EMAIL_TYPE_LABELS[type]}» ignorado (${result.reason ?? 'regra anti-spam'}).`, 'info');
      } else if (result.error) {
        showToast(result.error, 'error');
      } else {
        showToast(`Email «${EMAIL_TYPE_LABELS[type]}» — ${mode} OK.`, 'success');
      }
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

  useEffect(() => {
    if (!isEmailDevToolsEnabled()) return;
    void fetchEmailProviderStatus().then(setEmailProviderStatus);
  }, [emailLoading]);

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
            Filtra por operações financeiras (movimentos, OCR, créditos, objetivos, etc.).
            Se aparecer STALL, o último passo indica onde a UI parou.
          </Text>

          {financialOnly ? (
            <Text variant="caption" color="textMuted" style={styles.flowState}>
              Último passo: {flowState.lastStep} · há {flowState.msSinceLastStep}ms
            </Text>
          ) : null}

          <View style={styles.actions}>
            <Button
              label={financialOnly ? 'Ver todos os logs' : 'Só operações financeiras'}
              variant="secondary"
              onPress={() => setFinancialOnly((v) => !v)}
              fullWidth
            />
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
                Resend / lifecycle
              </Text>
              <Text variant="caption" color={emailProviderStatus?.resendConfigured ? 'primary' : 'warning'}>
                {describeEmailProviderStatus(emailProviderStatus)}
              </Text>
              <Text variant="label" color="textMuted" style={styles.emailHistoryTitle}>
                Testar emails lifecycle
              </Text>
              <Button
                label={emailPreviewMode ? 'Modo: preview (sem enviar)' : 'Modo: envio real (Resend)'}
                variant="ghost"
                onPress={() => setEmailPreviewMode((v) => !v)}
                fullWidth
              />
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

              <Text variant="label" color="textMuted" style={styles.emailHistoryTitle}>
                Histórico de emails (sem dados sensíveis)
              </Text>
              {(emailEvents ?? []).length === 0 ? (
                <Text variant="caption" color="textMuted">
                  Sem eventos registados. Testa um tipo acima.
                </Text>
              ) : (
                (emailEvents ?? []).map((event) => (
                  <View key={event.id} style={styles.emailEvent}>
                    <Text variant="caption" color="textMuted">
                      {EMAIL_STATUS_LABELS[event.status]} ·{' '}
                      {EMAIL_TYPE_LABELS[event.emailType as LifecycleEmailType] ?? event.emailType}
                    </Text>
                    <Text variant="caption" color="textSecondary">
                      {new Date(event.sentAt).toLocaleString('pt-PT')}
                    </Text>
                    {event.error ? (
                      <Text variant="caption" color="danger">
                        {event.error}
                      </Text>
                    ) : null}
                  </View>
                ))
              )}
            </View>
          ) : null}

          <View style={styles.list}>
            {visibleEntries.length === 0 ? (
              <Text variant="body" color="textMuted" align="center">
                Sem entradas {financialOnly ? 'movement_create' : ''}. Abre o modal e tenta guardar um movimento.
              </Text>
            ) : null}
            {visibleEntries.map((entry) => (
              <View
                key={entry.id}
                style={[
                  styles.entry,
                  entry.source === MOVEMENT_FLOW_SOURCE && styles.entryMovement,
                ]}>
                <Text variant="caption" color={entry.level === 'error' ? 'danger' : 'textMuted'}>
                  {entry.severity.toUpperCase()} · {entry.level.toUpperCase()} · {entry.source}
                </Text>
                <Text variant="bodyMedium" color={entry.source === MOVEMENT_FLOW_SOURCE ? 'primary' : 'text'}>
                  {entry.context?.step ? String(entry.context.step) : entry.message}
                </Text>
                {entry.context?.step && entry.message !== entry.context.step ? (
                  <Text variant="caption" color="textSecondary">
                    {entry.message}
                  </Text>
                ) : null}
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
    marginBottom: spacing.sm,
  },
  flowState: {
    marginBottom: spacing.md,
  },
  actions: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  emailSection: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  emailHistoryTitle: {
    marginTop: spacing.sm,
  },
  emailEvent: {
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    gap: 2,
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
  entryMovement: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  mono: {
    fontFamily: 'monospace',
    lineHeight: 16,
  },
});
