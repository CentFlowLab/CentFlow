import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DoctorOperationCard } from '@/components/diagnostics/DoctorOperationCard';
import {
  DoctorDatabaseSection,
  DoctorFilterBar,
  DoctorPerformanceSection,
  DoctorSummarySection,
} from '@/components/diagnostics/DoctorSections';
import { AppHeader } from '@/components/layout';
import { Button, ScreenContainer, Text, TextField } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useDiagnosticScreen } from '@/hooks/useDiagnosticScreen';
import { queryClient } from '@/lib/api/queryClient';
import { useAuth } from '@/lib/auth';
import {
  buildDoctorViewModel,
  clearAppLog,
  exportDoctorJson,
  exportDoctorText,
  filterOperations,
  isDiagnosticsEnabled,
  runDoctorHealthChecks,
  subscribeAppLog,
  type AppLogEntry,
  type DoctorFilter,
  type DoctorHealthSnapshot,
  type DoctorTab,
} from '@/lib/diagnostics';
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

const TABS: Array<{ key: DoctorTab; label: string }> = [
  { key: 'summary', label: 'Resumo' },
  { key: 'errors', label: 'Erros' },
  { key: 'performance', label: 'Performance' },
  { key: 'sync', label: 'Sync' },
  { key: 'database', label: 'BD' },
  { key: 'logs', label: 'Logs' },
];

const FILTERS: Array<{ key: DoctorFilter; label: string }> = [
  { key: 'all', label: 'Todos' },
  { key: 'errors', label: 'Erros' },
  { key: 'warnings', label: 'Warnings' },
  { key: 'movement', label: 'Movimentos' },
  { key: 'goal', label: 'Objetivos' },
  { key: 'account', label: 'Contas' },
  { key: 'ocr', label: 'OCR' },
  { key: 'performance', label: 'Performance' },
  { key: 'auth', label: 'Auth' },
  { key: 'supabase', label: 'Supabase' },
  { key: 'sync', label: 'Sync' },
];

const DEFAULT_HEALTH: DoctorHealthSnapshot = {
  checkedAt: new Date(0).toISOString(),
  supabase: { status: 'unknown', message: 'A carregar…' },
  session: { status: 'unknown' },
  refreshToken: { status: 'unknown' },
  rls: { status: 'unknown' },
  migrations: { status: 'unknown' },
  storage: { status: 'unknown' },
  ota: { status: 'unknown' },
  cache: { status: 'unknown', pendingQueries: 0 },
};

export default function DiagnosticsSettingsScreen() {
  useDiagnosticScreen('doctor');

  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { user } = useAuth();
  const [entries, setEntries] = useState<AppLogEntry[]>([]);
  const [health, setHealth] = useState<DoctorHealthSnapshot>(DEFAULT_HEALTH);
  const [tab, setTab] = useState<DoctorTab>('summary');
  const [filter, setFilter] = useState<DoctorFilter>('all');
  const [search, setSearch] = useState('');
  const [emailLoading, setEmailLoading] = useState<LifecycleEmailType | null>(null);
  const [emailPreviewMode, setEmailPreviewMode] = useState(true);
  const [emailProviderStatus, setEmailProviderStatus] = useState<EmailProviderStatus | null>(null);
  const [emailStatusLine, setEmailStatusLine] = useState<string | null>(null);
  const { data: emailEvents, refetch: refetchEmailEvents } = useEmailEvents();

  const refreshHealth = useCallback(async () => {
    const snapshot = await runDoctorHealthChecks(queryClient);
    setHealth(snapshot);
  }, []);

  useEffect(() => {
    if (!isDiagnosticsEnabled()) {
      router.back();
      return;
    }
    const unsub = subscribeAppLog(setEntries);
    void refreshHealth();
    const interval = setInterval(() => void refreshHealth(), 15_000);
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [refreshHealth]);

  useEffect(() => {
    if (!isEmailDevToolsEnabled()) return;
    void fetchEmailProviderStatus().then(setEmailProviderStatus);
  }, [emailLoading]);

  const view = useMemo(() => buildDoctorViewModel(entries, health), [entries, health]);

  const visibleOperations = useMemo(() => {
    const base =
      tab === 'errors'
        ? filterOperations(view.operations, 'errors', search)
        : filterOperations(view.operations, filter, search);
    return base;
  }, [view.operations, tab, filter, search]);

  const emailTestTypes = Object.keys(EMAIL_TYPE_LABELS) as LifecycleEmailType[];

  async function handleTestEmail(type: LifecycleEmailType) {
    setEmailLoading(type);
    const modeLabel = emailPreviewMode ? 'preview' : 'envio real';
    setEmailStatusLine(`A enviar (${modeLabel})…`);
    try {
      const result = await invokeTestEmail(type, { preview: emailPreviewMode });
      await refetchEmailEvents();
      void fetchEmailProviderStatus().then(setEmailProviderStatus);

      if (result.skipped) {
        const msg = `Ignorado (${result.reason ?? 'anti-spam'})`;
        setEmailStatusLine(`❌ ${msg}`);
        showToast(`Email «${EMAIL_TYPE_LABELS[type]}» ${msg}.`, 'info');
      } else if (result.error) {
        setEmailStatusLine(`❌ Erro: ${result.error}`);
        showToast(result.error, 'error');
      } else if (result.preview) {
        setEmailStatusLine('✅ Preview registado em email_events');
        showToast(`Preview «${EMAIL_TYPE_LABELS[type]}» OK.`, 'success');
      } else {
        const target = user?.email ?? 'a tua conta';
        setEmailStatusLine(`✅ Enviado para ${target}`);
        showToast(`Email «${EMAIL_TYPE_LABELS[type]}» enviado para ${target}.`, 'success');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao testar email.';
      setEmailStatusLine(`❌ Erro: ${message}`);
      showToast(message, 'error');
    } finally {
      setEmailLoading(null);
    }
  }

  async function handleShare(format: 'txt' | 'json') {
    try {
      const message = format === 'json' ? exportDoctorJson(entries, health) : exportDoctorText(entries, health);
      await Share.share({
        message,
        title: 'CentFlow Doctor — Diagnóstico',
      });
    } catch {
      showToast('Não foi possível exportar.', 'error');
    }
  }

  async function handleCopyLastError() {
    const lastError = view.operations.find((op) => op.humanError)?.humanError;
    if (!lastError) {
      showToast('Sem erros para copiar.', 'info');
      return;
    }
    const text = `${lastError.title}\n${lastError.message}\n\n${lastError.technicalMessage}`;
    try {
      await Share.share({ message: text, title: 'Erro CentFlow' });
    } catch {
      showToast('Não foi possível copiar.', 'error');
    }
  }

  if (!isDiagnosticsEnabled()) return null;

  return (
    <View style={styles.screen}>
      <AppHeader title="CentFlow Doctor" subtitle="Centro de diagnóstico inteligente" showBack />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, spacing['2xl']) },
        ]}>
        <ScreenContainer scrollable={false}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
            {TABS.map((item) => (
              <Pressable
                key={item.key}
                onPress={() => setTab(item.key)}
                style={[styles.tabChip, tab === item.key && styles.tabChipActive]}>
                <Text variant="caption" color={tab === item.key ? 'primary' : 'textMuted'}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.actions}>
            <Button label="Actualizar diagnóstico" variant="secondary" onPress={() => void refreshHealth()} fullWidth />
            <Button label="Exportar TXT" onPress={() => void handleShare('txt')} fullWidth />
            <Button label="Exportar JSON" variant="secondary" onPress={() => void handleShare('json')} fullWidth />
            <Button label="Copiar último erro" variant="ghost" onPress={() => void handleCopyLastError()} fullWidth />
            <Button
              label="Limpar logs"
              variant="ghost"
              onPress={() => {
                clearAppLog();
                showToast('Logs limpos.', 'info');
              }}
              fullWidth
            />
          </View>

          {tab === 'summary' ? <DoctorSummarySection summary={view.summary} health={view.health} /> : null}

          {tab === 'performance' ? <DoctorPerformanceSection metrics={view.performance} /> : null}

          {tab === 'sync' ? (
            <View style={styles.wrap}>
              <Text variant="body" color="textSecondary">
                Cache: {view.health.cache.message}
              </Text>
              <Text variant="body" color="textSecondary">
                Queries pendentes: {view.health.cache.pendingQueries}
              </Text>
              <Text variant="body" color="textSecondary">
                Última invalidação:{' '}
                {view.summary.lastSyncAt
                  ? new Date(view.summary.lastSyncAt).toLocaleString('pt-PT')
                  : 'Nenhuma registada'}
              </Text>
              <Text variant="caption" color="textMuted">
                OTA: {view.health.ota.message} ({view.environment.otaChannel ?? '—'})
              </Text>
            </View>
          ) : null}

          {tab === 'database' ? <DoctorDatabaseSection health={view.health} /> : null}

          {tab === 'errors' || tab === 'logs' ? (
            <View style={styles.wrap}>
              <TextField
                label="Pesquisar"
                value={search}
                onChangeText={setSearch}
                placeholder="movement, ocr, cache, error…"
              />
              {tab === 'logs' ? (
                <DoctorFilterBar filters={FILTERS} active={filter} onChange={(key) => setFilter(key as DoctorFilter)} />
              ) : null}

              {visibleOperations.length === 0 ? (
                <Text variant="body" color="textMuted" align="center">
                  {tab === 'errors'
                    ? 'Sem erros registados — boa sinal!'
                    : 'Sem operações. Executa acções na app (movimento, objetivo, OCR…) para ver diagnósticos agrupados.'}
                </Text>
              ) : (
                visibleOperations.map((operation) => (
                  <DoctorOperationCard key={operation.id} operation={operation} />
                ))
              )}
            </View>
          ) : null}

          {isEmailDevToolsEnabled() ? (
            <View style={styles.emailSection}>
              <Text variant="label" color="textMuted">
                Resend / lifecycle (dev)
              </Text>
              <Text variant="caption" color={emailProviderStatus?.resendConfigured ? 'primary' : 'warning'}>
                {describeEmailProviderStatus(emailProviderStatus)}
              </Text>
              {emailStatusLine ? (
                <Text variant="caption" color="textSecondary">
                  {emailStatusLine}
                </Text>
              ) : null}
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
              {(emailEvents ?? []).slice(0, 5).map((event) => (
                <View key={event.id} style={styles.emailEvent}>
                  <Text variant="caption" color="textMuted">
                    {EMAIL_STATUS_LABELS[event.status]} ·{' '}
                    {EMAIL_TYPE_LABELS[event.emailType as LifecycleEmailType] ?? event.emailType}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
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
  tabs: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  tabChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tabChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  actions: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  wrap: {
    gap: spacing.md,
  },
  emailSection: {
    gap: spacing.sm,
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  emailEvent: {
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
});
