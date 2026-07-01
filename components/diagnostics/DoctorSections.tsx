import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import type { DoctorHealthSnapshot, DoctorSummary, PerformanceMetric } from '@/lib/diagnostics/doctor-types';
import { colors, radius, spacing } from '@/lib/theme';

const OVERALL_EMOJI = {
  healthy: '🟢',
  warnings: '🟡',
  errors: '🔴',
} as const;

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricCard}>
      <Text variant="caption" color="textMuted">
        {label}
      </Text>
      <Text variant="bodyMedium" color="text">
        {value}
      </Text>
    </View>
  );
}

function perfColor(status: PerformanceMetric['status']) {
  if (status === 'ok') return colors.success;
  if (status === 'warning') return colors.warning;
  return colors.danger;
}

type SummaryProps = {
  summary: DoctorSummary;
  health: DoctorHealthSnapshot;
};

export function DoctorSummarySection({ summary, health }: SummaryProps) {
  const lastSync = summary.lastSyncAt
    ? new Date(summary.lastSyncAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
    : '—';

  return (
    <View style={styles.wrap}>
      <View style={styles.overall}>
        <Text variant="h2" color="text">
          {OVERALL_EMOJI[summary.overallStatus]} {summary.overallLabel}
        </Text>
      </View>

      <View style={styles.grid}>
        <MetricCard label="Crashes" value={String(summary.crashes)} />
        <MetricCard label="Warnings" value={String(summary.warnings)} />
        <MetricCard label="Erros" value={String(summary.errors)} />
        <MetricCard label="Supabase" value={health.supabase.message ?? health.supabase.status} />
        <MetricCard label="OTA" value={health.ota.message ?? health.ota.status} />
        <MetricCard label="Migrações" value={health.migrations.message ?? health.migrations.status} />
        <MetricCard label="RLS" value={health.rls.message ?? health.rls.status} />
        <MetricCard label="Cache" value={health.cache.message ?? health.cache.status} />
        <MetricCard label="Última sync" value={lastSync} />
        <MetricCard label="Tempo médio ops" value={`${summary.avgOperationMs} ms`} />
        <MetricCard
          label="Tempo médio OCR"
          value={summary.avgOcrMs !== null ? `${(summary.avgOcrMs / 1000).toFixed(2)} s` : '—'}
        />
        <MetricCard label="Queries pendentes" value={String(summary.pendingQueries)} />
      </View>

      <Text variant="label" color="textMuted" style={styles.sectionTitle}>
        Estado da aplicação
      </Text>
      <View style={styles.healthRow}>
        {summary.systemHealth.map((item) => (
          <View key={item.key} style={styles.healthChip}>
            <Text variant="caption" color="textSecondary">
              {item.status === 'ok' ? '🟢' : item.status === 'warning' ? '🟡' : '🔴'} {item.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

type PerformanceProps = {
  metrics: PerformanceMetric[];
};

export function DoctorPerformanceSection({ metrics }: PerformanceProps) {
  if (metrics.length === 0) {
    return (
      <Text variant="body" color="textMuted">
        Sem operações registadas para medir performance.
      </Text>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text variant="label" color="textMuted">
        Operações mais lentas
      </Text>
      {metrics.map((metric) => (
        <View key={metric.label} style={styles.perfRow}>
          <Text variant="bodyMedium" color="text">
            {metric.label}
          </Text>
          <Text variant="bodyMedium" style={{ color: perfColor(metric.status) }}>
            {metric.durationMs} ms
          </Text>
        </View>
      ))}
    </View>
  );
}

type DatabaseProps = {
  health: DoctorHealthSnapshot;
};

export function DoctorDatabaseSection({ health }: DatabaseProps) {
  const rows = [
    { label: 'Supabase online', value: health.supabase },
    { label: 'Schema / migrações', value: health.migrations },
    { label: 'RLS / policies', value: health.rls },
    { label: 'Refresh token', value: health.refreshToken },
    { label: 'Sessão', value: health.session },
    { label: 'Utilizador autenticado', value: health.session },
    { label: 'Storage', value: health.storage },
  ];

  return (
    <View style={styles.wrap}>
      {rows.map((row) => (
        <View key={row.label} style={styles.dbRow}>
          <Text variant="body" color="textSecondary">
            {row.label}
          </Text>
          <Text
            variant="bodyMedium"
            color={row.value.status === 'ok' ? 'success' : row.value.status === 'warning' ? 'warning' : 'danger'}>
            {row.value.status === 'ok' ? 'OK' : row.value.status === 'warning' ? 'Warning' : 'Erro'}
            {health.supabase.latencyMs && row.label === 'Supabase online'
              ? ` · ${health.supabase.latencyMs} ms`
              : ''}
          </Text>
          {row.value.message ? (
            <Text variant="caption" color="textMuted">
              {row.value.message}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

type FilterBarProps = {
  filters: Array<{ key: string; label: string }>;
  active: string;
  onChange: (key: string) => void;
};

export function DoctorFilterBar({ filters, active, onChange }: FilterBarProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterBar}>
      {filters.map((filter) => (
        <Pressable
          key={filter.key}
          onPress={() => onChange(filter.key)}
          style={[styles.filterChip, active === filter.key && styles.filterChipActive]}>
          <Text variant="caption" color={active === filter.key ? 'primary' : 'textMuted'}>
            {filter.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
  overall: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metricCard: {
    width: '47%',
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
  sectionTitle: {
    marginTop: spacing.xs,
  },
  healthRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  healthChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
  },
  perfRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dbRow: {
    gap: 2,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterBar: {
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  filterChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
});
