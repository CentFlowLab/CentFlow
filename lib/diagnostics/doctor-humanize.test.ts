import assert from 'node:assert/strict';
import test from 'node:test';

import type { AppLogEntry } from '@/lib/diagnostics/app-log';
import { humanizeError, humanizeStep, resolveOperationTitle } from '@/lib/diagnostics/doctor-humanize';

test('humanizeStep traduz passos técnicos', () => {
  assert.equal(humanizeStep('mutation_settled'), 'Concluído');
  assert.equal(humanizeStep('cache_invalidate_done'), 'Cache actualizado');
});

test('humanizeError traduz coluna em falta', () => {
  const info = humanizeError({
    id: '1',
    timestamp: new Date().toISOString(),
    level: 'error',
    severity: 'high',
    source: 'doctor:mutation',
    message: "Could not find the 'institution' column of 'accounts' in the schema cache",
  });

  assert.ok(info);
  assert.match(info!.message, /institution/i);
  assert.ok(info!.possibleCause?.includes('Migração'));
});

test('resolveOperationTitle — movimento criado', () => {
  assert.equal(resolveOperationTitle('movement_create', []), 'Movimento criado');
  assert.equal(resolveOperationTitle('create_transaction', [] as AppLogEntry[]), 'Movimento criado');
});
