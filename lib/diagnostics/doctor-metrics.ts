import type { QueryClient } from '@tanstack/react-query';
import * as Application from 'expo-application';
import * as Updates from 'expo-updates';
import { Platform } from 'react-native';

import type { AppLogEntry } from './app-log';
import type {
  DoctorEnvironmentContext,
  DoctorHealthSnapshot,
  DoctorSummary,
  HealthStatus,
  PerformanceMetric,
} from './doctor-types';
import type { DiagnosticOperation } from './doctor-types';
import { groupAppLogEntries } from './doctor-grouping';

function perfColor(ms: number): HealthStatus {
  if (ms < 300) return 'ok';
  if (ms <= 800) return 'warning';
  return 'error';
}

export function getDoctorEnvironmentContext(): DoctorEnvironmentContext {
  return {
    otaVersion: Updates.updateId ?? undefined,
    otaChannel: Updates.channel ?? undefined,
    buildVersion: Application.nativeApplicationVersion ?? undefined,
    nativeVersion: Application.nativeBuildVersion ?? undefined,
    platform: Platform.OS,
    osVersion: String(Platform.Version),
    commit: process.env.EXPO_PUBLIC_GIT_COMMIT ?? undefined,
  };
}

export function computePerformanceMetrics(operations: DiagnosticOperation[]): PerformanceMetric[] {
  const byCategory = new Map<string, { total: number; count: number; category: DiagnosticOperation['category'] }>();

  for (const op of operations) {
    const key = op.title;
    const current = byCategory.get(key) ?? { total: 0, count: 0, category: op.category };
    current.total += op.durationMs;
    current.count += 1;
    byCategory.set(key, current);
  }

  return [...byCategory.entries()]
    .map(([label, data]) => {
      const durationMs = Math.round(data.total / data.count);
      return {
        label,
        durationMs,
        category: data.category,
        status: perfColor(durationMs),
      };
    })
    .sort((a, b) => b.durationMs - a.durationMs)
    .slice(0, 12);
}

export function computeDoctorSummary(
  entries: AppLogEntry[],
  operations: DiagnosticOperation[],
  health: DoctorHealthSnapshot,
): DoctorSummary {
  const errors = entries.filter((e) => e.level === 'error').length;
  const warnings = entries.filter((e) => e.level === 'warn').length;
  const crashes = entries.filter(
    (e) => e.source === 'global-handler' || e.context?.isFatal === true,
  ).length;

  const opDurations = operations.map((o) => o.durationMs).filter((ms) => ms > 0);
  const avgOperationMs =
    opDurations.length > 0
      ? Math.round(opDurations.reduce((a, b) => a + b, 0) / opDurations.length)
      : 0;

  const ocrOps = operations.filter((o) => o.category === 'ocr');
  const avgOcrMs =
    ocrOps.length > 0
      ? Math.round(ocrOps.reduce((s, o) => s + o.durationMs, 0) / ocrOps.length)
      : null;

  const lastCache = entries.find((e) => String(e.context?.step) === 'cache_invalidate_done');

  let overallStatus: DoctorSummary['overallStatus'] = 'healthy';
  let overallLabel = 'Aplicação saudável';

  if (errors > 0 || health.supabase.status === 'error' || health.session.status === 'error') {
    overallStatus = 'errors';
    overallLabel = 'Existem erros';
  } else if (
    warnings > 0 ||
    health.supabase.status === 'warning' ||
    health.cache.status === 'warning'
  ) {
    overallStatus = 'warnings';
    overallLabel = 'Existem warnings';
  }

  const systemHealth = [
    { key: 'db', label: 'Base de dados', status: health.supabase.status },
    { key: 'cache', label: 'Cache', status: health.cache.status },
    { key: 'ota', label: 'OTA', status: health.ota.status },
    { key: 'login', label: 'Login', status: health.session.status },
    { key: 'sync', label: 'Sync', status: health.cache.status },
    { key: 'assets', label: 'Assets', status: 'ok' as HealthStatus },
  ];

  return {
    overallStatus,
    overallLabel,
    crashes,
    warnings,
    errors,
    avgOperationMs,
    avgOcrMs,
    pendingQueries: health.cache.pendingQueries,
    lastSyncAt: lastCache?.timestamp ?? null,
    systemHealth,
  };
}

export async function runDoctorHealthChecks(queryClient: QueryClient): Promise<DoctorHealthSnapshot> {
  const checkedAt = new Date().toISOString();
  const pendingQueries = queryClient
    .getQueryCache()
    .getAll()
    .filter((q) => q.state.fetchStatus === 'fetching').length;

  let supabaseStatus: DoctorHealthSnapshot['supabase'] = { status: 'unknown', message: 'A verificar…' };
  let sessionStatus: DoctorHealthSnapshot['session'] = { status: 'unknown' };
  let refreshTokenStatus: DoctorHealthSnapshot['refreshToken'] = { status: 'unknown' };
  let rlsStatus: DoctorHealthSnapshot['rls'] = { status: 'unknown' };
  let migrationsStatus: DoctorHealthSnapshot['migrations'] = { status: 'unknown' };
  let storageStatus: DoctorHealthSnapshot['storage'] = { status: 'unknown' };

  try {
    const { tryGetSupabaseClient } = await import('@/lib/supabase/client');
    const client = tryGetSupabaseClient();

    if (!client) {
      supabaseStatus = { status: 'error', message: 'Cliente Supabase não inicializado' };
      sessionStatus = { status: 'error', message: 'Sem cliente' };
    } else {
      const start = Date.now();
      const { error } = await client.from('transactions').select('id', { head: true, count: 'exact' });
      const latencyMs = Date.now() - start;

      if (error) {
        const msg = error.message;
        supabaseStatus = {
          status: /RLS|policy|permission/i.test(msg) ? 'warning' : 'error',
          latencyMs,
          message: msg,
        };
        rlsStatus = /RLS|policy|permission/i.test(msg)
          ? { status: 'warning', message: 'Possível bloqueio RLS' }
          : { status: 'ok', message: 'Sem bloqueio detectado' };
      } else {
        supabaseStatus = { status: latencyMs > 800 ? 'warning' : 'ok', latencyMs, message: 'Ligado' };
        rlsStatus = { status: 'ok', message: 'OK' };
      }

      const { data: sessionData, error: sessionError } = await client.auth.getSession();
      if (sessionError || !sessionData.session) {
        sessionStatus = {
          status: sessionError ? 'error' : 'warning',
          message: sessionError?.message ?? 'Utilizador não autenticado',
        };
        refreshTokenStatus = { status: 'warning', message: 'Sem sessão activa' };
      } else {
        sessionStatus = {
          status: 'ok',
          userId: sessionData.session.user.id,
          message: 'Autenticado',
        };
        refreshTokenStatus = {
          status: sessionData.session.expires_at ? 'ok' : 'warning',
          message: sessionData.session.expires_at ? 'Token activo' : 'Sem expiração conhecida',
        };
      }

      migrationsStatus = { status: 'ok', message: 'OK (verificação remota limitada)' };
      storageStatus = { status: 'ok', message: 'OK' };
    }
  } catch (error) {
    supabaseStatus = {
      status: 'error',
      message: error instanceof Error ? error.message : 'Falha no health check',
    };
  }

  let otaStatus: DoctorHealthSnapshot['ota'];
  if (__DEV__ || !Updates.isEnabled) {
    otaStatus = { status: 'warning', message: 'OTA desactivado (dev)' };
  } else {
    otaStatus = {
      status: 'ok',
      channel: Updates.channel ?? undefined,
      updateId: Updates.updateId ?? undefined,
      message: Updates.updateId ? 'Actualizada' : 'Runtime nativo',
    };
  }

  const cacheStatus: DoctorHealthSnapshot['cache'] = {
    status: pendingQueries > 3 ? 'warning' : 'ok',
    pendingQueries,
    message: pendingQueries === 0 ? 'Sincronizada' : `${pendingQueries} queries pendentes`,
  };

  return {
    checkedAt,
    supabase: supabaseStatus,
    session: sessionStatus,
    refreshToken: refreshTokenStatus,
    rls: rlsStatus,
    migrations: migrationsStatus,
    storage: storageStatus,
    ota: otaStatus,
    cache: cacheStatus,
  };
}

export function buildDoctorViewModel(entries: AppLogEntry[], health: DoctorHealthSnapshot) {
  const operations = groupAppLogEntries(entries);
  const performance = computePerformanceMetrics(operations);
  const summary = computeDoctorSummary(entries, operations, health);
  const environment = getDoctorEnvironmentContext();

  return { operations, performance, summary, health, environment };
}
