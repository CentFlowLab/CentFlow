import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import type { DiagnosticOperation, OperationStatus } from '@/lib/diagnostics/doctor-types';
import { colors, radius, spacing } from '@/lib/theme';

const STATUS_ICON: Record<OperationStatus, string> = {
  success: '🟢',
  warning: '🟡',
  error: '🔴',
  cancelled: '⚪',
  timeout: '🟠',
  offline: '🟣',
  running: '🔵',
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-PT', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

type Props = {
  operation: DiagnosticOperation;
};

export function DoctorOperationCard({ operation }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Pressable
      onPress={() => setExpanded((v) => !v)}
      style={[styles.card, operation.status === 'error' && styles.cardError]}>
      <View style={styles.header}>
        <Text variant="bodyMedium" color="text">
          {STATUS_ICON[operation.status]} {operation.title}
        </Text>
        <Text variant="caption" color="textMuted">
          {formatTime(operation.startedAt)}
        </Text>
      </View>

      <Text variant="caption" color="textSecondary">
        {operation.eventCount} eventos · {operation.durationMs} ms
        {operation.origin ? ` · ${operation.origin}` : ''}
      </Text>

      {operation.humanError && !expanded ? (
        <Text variant="caption" color="danger" numberOfLines={2}>
          {operation.humanError.message}
        </Text>
      ) : null}

      <Text variant="caption" color="primary">
        {expanded ? '▲ Ocultar detalhes' : '▼ Ver detalhes'}
      </Text>

      {expanded ? (
        <View style={styles.details}>
          {operation.humanError ? (
            <View style={styles.errorBox}>
              <Text variant="bodyMedium" color="danger">
                {operation.humanError.title}
              </Text>
              <Text variant="caption" color="textSecondary">
                {operation.humanError.message}
              </Text>
              {operation.humanError.possibleCause ? (
                <Text variant="caption" color="textMuted">
                  Possível causa: {operation.humanError.possibleCause}
                </Text>
              ) : null}
              {operation.humanError.solution ? (
                <Text variant="caption" color="textMuted">
                  Solução: {operation.humanError.solution}
                </Text>
              ) : null}
              <Text variant="caption" color="textMuted" style={styles.mono}>
                Técnico: {operation.humanError.technicalMessage}
              </Text>
              {operation.humanError.stack ? (
                <Text variant="caption" color="textMuted" style={styles.mono}>
                  {operation.humanError.stack}
                </Text>
              ) : null}
            </View>
          ) : null}

          <Text variant="label" color="textMuted">
            Timeline
          </Text>
          {operation.timeline.map((phase) => (
            <View key={phase.key} style={styles.timelineRow}>
              <Text variant="caption" color={phase.status === 'error' ? 'danger' : 'textSecondary'}>
                {phase.status === 'success' ? '✓' : phase.status === 'error' ? '✗' : '•'} {phase.label}
              </Text>
              <Text variant="caption" color="textMuted">
                {phase.steps.join(' → ')}
              </Text>
            </View>
          ))}

          {operation.screen || operation.action ? (
            <Text variant="caption" color="textMuted">
              Contexto: {operation.screen ?? '—'} · {operation.action ?? '—'}
            </Text>
          ) : null}

          {operation.entries.map((entry) => (
            <View key={entry.id} style={styles.rawEntry}>
              <Text variant="caption" color="textMuted">
                {entry.level.toUpperCase()} · {String(entry.context?.step ?? entry.message)}
              </Text>
              {entry.context?.payload ? (
                <Text variant="caption" color="textMuted" style={styles.mono} numberOfLines={4}>
                  payload: {JSON.stringify(entry.context.payload)}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  cardError: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerMuted,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  details: {
    marginTop: spacing.sm,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  errorBox: {
    gap: 4,
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.dangerMuted,
  },
  timelineRow: {
    gap: 2,
    paddingLeft: spacing.xs,
    borderLeftWidth: 2,
    borderLeftColor: colors.primary,
  },
  rawEntry: {
    padding: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceElevated,
  },
  mono: {
    fontFamily: 'monospace',
    lineHeight: 16,
  },
});
