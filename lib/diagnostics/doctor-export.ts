import type { DoctorExportPayload } from './doctor-types';
import { exportAppLogText } from './app-log';
import { buildDoctorViewModel } from './doctor-metrics';
import type { AppLogEntry } from './app-log';
import type { DoctorHealthSnapshot } from './doctor-types';

export function exportDoctorJson(entries: AppLogEntry[], health: DoctorHealthSnapshot): string {
  const view = buildDoctorViewModel(entries, health);
  const payload: DoctorExportPayload = {
    exportedAt: new Date().toISOString(),
    environment: view.environment,
    summary: view.summary,
    health: view.health,
    performance: view.performance,
    operations: view.operations,
    rawEntryCount: entries.length,
  };

  return JSON.stringify(payload, null, 2);
}

export function exportDoctorText(entries: AppLogEntry[], health: DoctorHealthSnapshot): string {
  const view = buildDoctorViewModel(entries, health);
  const lines: string[] = [
    'CentFlow Doctor — Diagnóstico',
    `Exportado: ${new Date().toISOString()}`,
    '',
    `Estado: ${view.summary.overallLabel}`,
    `Erros: ${view.summary.errors} · Warnings: ${view.summary.warnings} · Crashes: ${view.summary.crashes}`,
    '',
    '— Operações agrupadas —',
  ];

  for (const op of view.operations.slice(0, 50)) {
    lines.push(
      `[${op.status.toUpperCase()}] ${op.title} · ${op.eventCount} eventos · ${op.durationMs}ms · ${op.startedAt}`,
    );
    if (op.humanError) {
      lines.push(`  Erro: ${op.humanError.message}`);
      if (op.humanError.possibleCause) lines.push(`  Causa: ${op.humanError.possibleCause}`);
    }
  }

  lines.push('', '— Performance —');
  for (const metric of view.performance) {
    lines.push(`${metric.label}: ${metric.durationMs}ms`);
  }

  lines.push('', '— Saúde —');
  lines.push(`Supabase: ${view.health.supabase.status} (${view.health.supabase.message ?? ''})`);
  lines.push(`Sessão: ${view.health.session.status} (${view.health.session.message ?? ''})`);
  lines.push(`OTA: ${view.health.ota.status} (${view.health.ota.message ?? ''})`);
  lines.push(`Cache: ${view.health.cache.message ?? ''}`);

  lines.push('', '— Logs brutos —', exportAppLogText());

  return lines.join('\n');
}
