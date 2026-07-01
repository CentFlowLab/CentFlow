import assert from 'node:assert/strict';
import test from 'node:test';

import type { AppLogEntry } from '@/lib/diagnostics/app-log';
import { groupAppLogEntries } from '@/lib/diagnostics/doctor-grouping';

function entry(
  partial: Partial<AppLogEntry> & Pick<AppLogEntry, 'source' | 'message'>,
): AppLogEntry {
  return {
    id: partial.id ?? `e-${Math.random()}`,
    timestamp: partial.timestamp ?? new Date().toISOString(),
    level: partial.level ?? 'info',
    severity: partial.severity ?? 'low',
    source: partial.source,
    message: partial.message,
    context: partial.context,
    stack: partial.stack,
  };
}

test('agrupa passos de mutation numa única operação', () => {
  const base = Date.now();
  const t = (offset: number) => new Date(base + offset).toISOString();
  const opId = 'movement-test-1';

  const operations = groupAppLogEntries([
    entry({ source: 'movement_create', message: 'save_click', timestamp: t(0), context: { step: 'save_click', action: 'movement_create', operationId: opId } }),
    entry({ source: 'movement_create', message: 'mutation_start', timestamp: t(10), context: { step: 'mutation_start', action: 'movement_create', operationId: opId } }),
    entry({ source: 'movement_create', message: 'mutation_service_supabase_insert', timestamp: t(50), context: { step: 'mutation_service_supabase_insert', action: 'movement_create', operationId: opId } }),
    entry({ source: 'movement_create', message: 'cache_invalidate_start', timestamp: t(80), context: { step: 'cache_invalidate_start', action: 'movement_create', operationId: opId } }),
    entry({ source: 'movement_create', message: 'cache_invalidate_done', timestamp: t(120), context: { step: 'cache_invalidate_done', action: 'movement_create', operationId: opId } }),
    entry({ source: 'movement_create', message: 'mutation_settled', timestamp: t(150), context: { step: 'mutation_settled', action: 'movement_create', operationId: opId } }),
  ]);

  assert.equal(operations.length, 1);
  assert.equal(operations[0].eventCount, 6);
  assert.equal(operations[0].status, 'success');
  assert.equal(operations[0].title, 'Movimento criado');
  assert.ok(operations[0].timeline.some((p) => p.label === 'Supabase'));
});

test('operacao com erro termina em estado error', () => {
  const operations = groupAppLogEntries([
    entry({
      source: 'movement_create',
      message: 'mutation_error',
      level: 'error',
      context: { step: 'mutation_error', action: 'movement_create', operationId: 'op-err' },
    }),
  ]);

  assert.equal(operations[0].status, 'error');
  assert.ok(operations[0].humanError);
});

test('não perde entradas soltas — cada uma vira operação', () => {
  const operations = groupAppLogEntries([
    entry({ source: 'console', message: 'hello', timestamp: new Date(0).toISOString() }),
    entry({ source: 'security', message: 'login ok', timestamp: new Date(5000).toISOString(), context: { action: 'login' } }),
  ]);

  assert.equal(operations.length, 2);
});
