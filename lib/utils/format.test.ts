import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatDateShort,
  formatDaySectionTitle,
  formatTransactionDateLabel,
} from '@/lib/utils/format';

const JULY_3_2026 = new Date(2026, 6, 3, 12, 0, 0);

test('formatDaySectionTitle — Hoje e Ontem', () => {
  assert.equal(formatDaySectionTitle('2026-07-03', JULY_3_2026), 'Hoje');
  assert.equal(formatDaySectionTitle('2026-07-02', JULY_3_2026), 'Ontem');
});

test('formatDaySectionTitle — DD/MM explícito, nunca M/D ambíguo', () => {
  const title = formatDaySectionTitle('2026-07-01', JULY_3_2026);
  assert.match(title, /01\/07/);
  assert.doesNotMatch(title, /7\/01/);
});

test('formatDaySectionTitle — Junho mostra 07/06, não fevereiro', () => {
  const title = formatDaySectionTitle('2026-06-07', JULY_3_2026);
  assert.match(title, /07\/06/);
});

test('formatDateShort — parse ISO sem drift de timezone', () => {
  assert.equal(formatDateShort('2026-07-01'), '01/07/2026');
  assert.equal(formatDateShort('2026-06-15'), '15/06/2026');
});

test('formatTransactionDateLabel — relativo e compacto', () => {
  assert.equal(formatTransactionDateLabel('2026-07-03', JULY_3_2026), 'Hoje');
  assert.equal(formatTransactionDateLabel('2026-06-20', JULY_3_2026), '20/06');
  assert.equal(formatTransactionDateLabel('2025-12-01', JULY_3_2026), '01/12/2025');
});
